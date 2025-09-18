import { FieldError } from "react-hook-form";

type Props = {
    field: FieldError | undefined
}
export function ErrorText({ field }: Props) {
    if (!field) return;
    return (
        <span className="text-red-500 text-sm mt-1 block">{field.message}</span>
    )
}