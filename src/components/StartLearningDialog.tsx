
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface StartLearningDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const StartLearningDialog = ({ isOpen, onClose }: StartLearningDialogProps) => {
  const navigate = useNavigate();

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Choose How to Start</AlertDialogTitle>
          <AlertDialogDescription>
            You can start learning right away as a guest or create an account to save your progress.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-col gap-2">
          <Button 
            className="w-full bg-gradient-to-r from-purple-600 to-blue-500 hover:opacity-90"
            onClick={() => navigate('/dashboard')}
          >
            Continue as Guest
          </Button>
          <div className="flex w-full gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                onClose();
                navigate("/login");
              }}
            >
              Login
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                onClose();
                navigate("/signup");
              }}
            >
              Sign Up
            </Button>
          </div>
          <AlertDialogCancel className="w-full sm:w-full">Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default StartLearningDialog;
