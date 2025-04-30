import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LogIn, UserPlus } from 'lucide-react';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { useState } from 'react';
import StartLearningDialog from '@/components/StartLearningDialog';

const PROJECT_DESCRIPTION = `
**AI Reverse Learning**  
An interactive learning platform where *you* teach the AI instead of just learning from it.  
The AI listens, analyzes, and asks smart questions to test your understanding and improve your explanations.  
It provides real-time feedback and suggestions—perfect for students, teachers, or anyone preparing a presentation.
`;

const FEATURES = [
  {
    title: "Interactive Learning",
    description: "Teach concepts to our AI and get real-time feedback on your explanations.",
  },
  {
    title: "Smart Analysis",
    description: "Receive detailed feedback on clarity, pacing, and structure of your explanations.",
  },
  {
    title: "Multiple Modes",
    description: "Practice explaining, test your knowledge, or prepare presentations.",
  },
];

const Index = () => {
  const navigate = useNavigate();
  const [showStartDialog, setShowStartDialog] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed w-full top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">AI Reverse Learning</h1>
          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            <Button 
              variant="outline" 
              onClick={() => navigate('/login')}
            >
              <LogIn className="mr-2 h-4 w-4" /> Login
            </Button>
            <Button 
              variant="default" 
              onClick={() => navigate('/signup')}
            >
              <UserPlus className="mr-2 h-4 w-4" /> Sign Up
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-24 pb-16">
        {/* Hero Section */}
        <section className="py-16 text-center">
          <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
            Master Any Topic by Teaching AI
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Transform your learning experience by explaining concepts to our AI. Get instant feedback, 
            improve your understanding, and become a better communicator.
          </p>
          <Button 
            size="lg"
            onClick={() => setShowStartDialog(true)} 
            className="bg-gradient-to-r from-purple-600 to-blue-500 hover:opacity-90"
          >
            Start Learning Now
          </Button>
        </section>

        {/* Features Section */}
        <section className="py-16">
          <h3 className="text-2xl font-semibold text-center mb-12">Key Features</h3>
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((feature) => (
              <Card key={feature.title} className="border border-border/50">
                <CardContent className="pt-6">
                  <h4 className="text-xl font-medium mb-2">{feature.title}</h4>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <StartLearningDialog 
          isOpen={showStartDialog} 
          onClose={() => setShowStartDialog(false)} 
        />
      </main>
    </div>
  );
};

export default Index;
