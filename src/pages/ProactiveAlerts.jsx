import React from "react";
import ProactiveAlertMonitor from "../components/ai/ProactiveAlertMonitor";

export default function ProactiveAlertsPage() {
    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <ProactiveAlertMonitor />
            </div>
        </div>
    );
}