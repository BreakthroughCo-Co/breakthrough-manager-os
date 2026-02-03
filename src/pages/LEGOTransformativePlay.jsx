import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Heart, Brain, Users, Sparkles } from 'lucide-react';

export default function LEGOTransformativePlay() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">LEGO® Transformative Play</h1>
        <p className="text-muted-foreground mt-2 max-w-3xl">
          Evidence-informed therapeutic approach using LEGO®-based activities to support emotional regulation, social skills, and positive behaviour development for neurodivergent individuals within NDIS services.
        </p>
      </div>

      {/* Overview Section */}
      <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            Approach Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed">
            LEGO®-based therapy is increasingly used as a therapeutic and developmental tool to support individuals in building emotional regulation, social skills, and positive behaviour. This structured, engaging, and hands-on approach is particularly effective for individuals with neurodiverse needs.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-white rounded border border-blue-100">
              <p className="font-semibold text-sm text-blue-900 mb-1">Person-Centred Focus</p>
              <p className="text-xs text-blue-800">Holistic approach targeting emotional, social, and cognitive growth with individualised adaptation.</p>
            </div>
            <div className="p-3 bg-white rounded border border-blue-100">
              <p className="font-semibold text-sm text-blue-900 mb-1">Neurodiversity Celebration</p>
              <p className="text-xs text-blue-800">Embraces and supports unique strengths through tailored, inclusive LEGO® activities.</p>
            </div>
            <div className="p-3 bg-white rounded border border-blue-100">
              <p className="font-semibold text-sm text-blue-900 mb-1">Structured & Engaging</p>
              <p className="text-xs text-blue-800">Combines creativity, structure, and play to reduce anxiety and enhance learning.</p>
            </div>
            <div className="p-3 bg-white rounded border border-blue-100">
              <p className="font-semibold text-sm text-blue-900 mb-1">Collaborative Learning</p>
              <p className="text-xs text-blue-800">Encourages teamwork and problem-solving through shared LEGO® building tasks.</p>
            </div>
          </div>

          <div className="p-4 bg-white rounded border border-blue-200 mt-4">
            <p className="text-sm font-semibold text-blue-900 mb-2">Key Design Principles</p>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">→</span>
                <span>Foster collaboration and meaningful interaction through shared LEGO® building tasks</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">→</span>
                <span>Enhance fine motor skills and coordination through practical, hands-on construction</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">→</span>
                <span>Provide predictable and supportive environment that reduces anxiety and enhances learning</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">→</span>
                <span>Build confidence, strengthen relationships, and develop essential life skills in engaging way</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Approaches */}
      <Tabs defaultValue="motivation" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="motivation" className="flex items-center gap-1">
            <Lightbulb className="w-4 h-4" />
            <span className="hidden sm:inline">Motivation</span>
          </TabsTrigger>
          <TabsTrigger value="emotion" className="flex items-center gap-1">
            <Heart className="w-4 h-4" />
            <span className="hidden sm:inline">Emotions</span>
          </TabsTrigger>
          <TabsTrigger value="skills" className="flex items-center gap-1">
            <Brain className="w-4 h-4" />
            <span className="hidden sm:inline">Skills</span>
          </TabsTrigger>
          <TabsTrigger value="social" className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Social</span>
          </TabsTrigger>
        </TabsList>

        {/* Building Motivation */}
        <TabsContent value="motivation">
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-yellow-900 flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Building Motivation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white rounded p-4 border border-yellow-100">
                <p className="text-sm leading-relaxed text-slate-700">
                  Children's unique interests are a powerful catalyst for learning and personal growth. LEGO®-based activities tap into this intrinsic motivation by offering opportunities for mastery, skill development, and social connection. The engaging nature of LEGO® play fosters enjoyment while promoting meaningful progress, making it an ideal tool for encouraging both learning and positive change.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-yellow-900 text-sm">Key Elements</h4>
                <ul className="space-y-2">
                  {[
                    'Taps into intrinsic motivation through personal interests and preferences',
                    'Provides structured opportunities for skill mastery and achievement',
                    'Creates social connection and collaborative learning experiences',
                    'Fosters enjoyment while promoting meaningful developmental progress',
                    'Encourages positive behaviour change through engaging, hands-on activities'
                  ].map((element, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-yellow-900">
                      <span className="text-yellow-600 font-bold mt-1">✓</span>
                      <span>{element}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Emotional Regulation */}
        <TabsContent value="emotion">
          <Card className="border-rose-200 bg-rose-50">
            <CardHeader>
              <CardTitle className="text-rose-900 flex items-center gap-2">
                <Heart className="w-5 h-5" />
                Emotional Regulation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white rounded p-4 border border-rose-100">
                <p className="text-sm leading-relaxed text-slate-700">
                  Our approach fosters a safe and supportive space where learners are encouraged to express their emotions openly, promoting greater self-awareness and understanding of others. This emotional openness creates meaningful opportunities for reflection, helping individuals process their experiences, recognise personal strengths and challenges, and develop internal self-regulation. As coping skills improve, learners become better equipped to monitor their progress, learn from setbacks, and navigate emotional experiences with increased resilience.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-white rounded border border-rose-100">
                  <p className="font-semibold text-rose-900 text-xs mb-2">Safe Expression</p>
                  <p className="text-xs text-rose-800">Encourages open emotional expression in supportive environment</p>
                </div>
                <div className="p-3 bg-white rounded border border-rose-100">
                  <p className="font-semibold text-rose-900 text-xs mb-2">Self-Awareness</p>
                  <p className="text-xs text-rose-800">Builds personal understanding and insight into emotions</p>
                </div>
                <div className="p-3 bg-white rounded border border-rose-100">
                  <p className="font-semibold text-rose-900 text-xs mb-2">Internal Regulation</p>
                  <p className="text-xs text-rose-800">Develops coping skills and emotional self-regulation</p>
                </div>
                <div className="p-3 bg-white rounded border border-rose-100">
                  <p className="font-semibold text-rose-900 text-xs mb-2">Resilience Building</p>
                  <p className="text-xs text-rose-800">Increases capacity to navigate challenges with confidence</p>
                </div>
              </div>

              <div className="p-3 bg-rose-100 rounded border border-rose-200">
                <p className="text-xs text-rose-900 font-semibold">Progression Path:</p>
                <p className="text-xs text-rose-800 mt-1">Emotional openness → Self-reflection → Strength recognition → Coping skill development → Resilience & progress monitoring</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Skill Building */}
        <TabsContent value="skills">
          <Card className="border-purple-200 bg-purple-50">
            <CardHeader>
              <CardTitle className="text-purple-900 flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Skill Building
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white rounded p-4 border border-purple-100">
                <p className="text-sm leading-relaxed text-slate-700">
                  LEGO® therapy places a strong emphasis on social communication and collaboration, fostering reciprocal relationships through joint attention, shared goals, and effective conflict resolution. Within this structured play environment, learners build critical skills such as problem-solving, self-regulation, and social adaptability, while also strengthening their ability to manage tasks, time, and priorities with confidence and efficiency.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-purple-900 text-sm">Competency Development Areas</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[
                    { area: 'Social Communication', desc: 'Joint attention and shared goal-setting' },
                    { area: 'Problem-Solving', desc: 'Critical thinking through construction challenges' },
                    { area: 'Self-Regulation', desc: 'Managing impulses and emotions during play' },
                    { area: 'Social Adaptability', desc: 'Flexibility in group interactions and feedback' },
                    { area: 'Task Management', desc: 'Organization and planning of complex projects' },
                    { area: 'Conflict Resolution', desc: 'Collaborative problem-solving with peers' },
                    { area: 'Reciprocal Relationships', desc: 'Meaningful social connection and cooperation' },
                    { area: 'Confidence & Efficiency', desc: 'Increased self-efficacy in learning and tasks' }
                  ].map((item, idx) => (
                    <div key={idx} className="p-2 bg-white rounded border border-purple-100">
                      <p className="font-semibold text-purple-900 text-xs">{item.area}</p>
                      <p className="text-xs text-purple-800 mt-1">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Communication */}
        <TabsContent value="social">
          <Card className="border-emerald-200 bg-emerald-50">
            <CardHeader>
              <CardTitle className="text-emerald-900 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Social Communication Competence
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white rounded p-4 border border-emerald-100">
                <p className="text-sm leading-relaxed text-slate-700">
                  LEGO® Transformative Play encourages greater self-initiated social interaction and sustained engagement in social activities. By reducing stereotyped behaviours, this approach promotes adaptive socialisation and imaginative play, fostering deeper, more meaningful connections with others.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 bg-white rounded border border-emerald-100 space-y-2">
                  <h4 className="font-semibold text-emerald-900 text-sm">Behavioral Changes</h4>
                  <ul className="space-y-1 text-xs text-emerald-800">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600">→</span>
                      <span>Reduction in stereotyped behaviours</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600">→</span>
                      <span>Increased self-initiated social interaction</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600">→</span>
                      <span>Sustained engagement in collaborative activities</span>
                    </li>
                  </ul>
                </div>

                <div className="p-4 bg-white rounded border border-emerald-100 space-y-2">
                  <h4 className="font-semibold text-emerald-900 text-sm">Relationship Building</h4>
                  <ul className="space-y-1 text-xs text-emerald-800">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600">→</span>
                      <span>Adaptive socialisation patterns</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600">→</span>
                      <span>Imaginative and creative engagement</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600">→</span>
                      <span>Deeper, meaningful peer connections</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="p-4 bg-emerald-100 rounded border border-emerald-200">
                <p className="text-xs font-semibold text-emerald-900 mb-2">Communication Competency Progression</p>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Structured play → Shared attention → Collaborative problem-solving → Meaningful peer interaction → Sustained social engagement → Stronger interpersonal relationships
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Evidence-Based Framework */}
      <Card>
        <CardHeader>
          <CardTitle>LEGO® Therapy as Evidence-Based Practice</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-700">
            This evidence-informed approach integrates best practices in neurodevelopmental support with therapeutic play principles, creating a comprehensive intervention framework that addresses:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <Badge className="mb-3 bg-teal-600">Developmental Support</Badge>
              <ul className="space-y-2 text-sm text-slate-700">
                <li>• Fine motor skill development and coordination</li>
                <li>• Cognitive growth and problem-solving</li>
                <li>• Emotional and social development</li>
                <li>• Confidence and self-efficacy building</li>
              </ul>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <Badge className="mb-3 bg-blue-600">Therapeutic Outcomes</Badge>
              <ul className="space-y-2 text-sm text-slate-700">
                <li>• Anxiety reduction through structured play</li>
                <li>• Emotional regulation improvement</li>
                <li>• Positive behaviour development</li>
                <li>• Social connection strengthening</li>
              </ul>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200">
            <p className="text-sm font-semibold text-teal-900 mb-2">Implementation Within NDIS Context</p>
            <p className="text-sm text-teal-800">
              LEGO® Transformative Play aligns with NDIS goals around building capacity, social participation, and positive behaviour support. It provides a structured, measurable, and engaging approach to goal achievement that practitioners can document and track within standard service planning and review frameworks.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}