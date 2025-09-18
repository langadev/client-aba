import { Loader2 } from "lucide-react";
import { Button } from "./ui/button";

type LoadingButtonProps = {
    isLoading: boolean;
    text: string;
    onClick?: () => void;
    submit?: boolean;
};
export function LoadingButton({
    isLoading,
    text,
    onClick,
    submit = false,
}: LoadingButtonProps) {
    return (
        <Button
            onClick={onClick}
            disabled={isLoading}
            type={submit ? "submit" : "button"}
        >
            {text}
            {isLoading && <Loader2 className="animate-spin" />}
        </Button>
    );
}