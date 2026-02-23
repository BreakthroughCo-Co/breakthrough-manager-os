import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireAdmin } from './_shared/requireRole.js';
import { createRequestLogger } from './_shared/logger.js';

/**
 * Download Audit Evidence Package
 * 
 * Generates signed URL for secure download of audit package.
 * Logs all access for audit trail.
 */

Deno.serve(async (req) => {
    const logger = createRequestLogger(req);
    
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        requireAdmin(user);
        
        const { package_id } = await req.json();
        
        if (!package_id) {
            return Response.json({ error: 'package_id required' }, { status: 400 });
        }
        
        // Get package record
        const packageRecord = await base44.entities.AuditEvidencePackage.get(package_id);
        
        if (!packageRecord) {
            return Response.json({ error: 'Package not found' }, { status: 404 });
        }
        
        // Generate signed URL (valid for 1 hour)
        const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
            file_uri: packageRecord.package_file_uri,
            expires_in: 3600
        });
        
        logger.audit('audit_package_downloaded', {
            package_id: packageRecord.id,
            downloaded_by: user.email,
            package_name: packageRecord.package_name
        });
        
        return Response.json({
            success: true,
            download_url: signed_url,
            package_name: packageRecord.package_name,
            checksum: packageRecord.checksum,
            expires_in: 3600
        });
        
    } catch (error) {
        logger.error('Package download failed', error);
        
        return Response.json({
            error: 'Download failed',
            message: error.message
        }, { status: 500 });
    }
});