/* src/components/ui/input.tsx */
import * as React from "react";
import { cn } from "~/lib/utils";

// Define props specifically for input and textarea, then create a union

// Base props common to both input and textarea (extend HTMLAttributes)
// Exclude props that differ significantly or are invalid on one type
type BaseElementProps = Omit<
  React.HTMLAttributes<HTMLInputElement | HTMLTextAreaElement>,
  "onChange" | "type" // Exclude differing/invalid props
>;

// Props specific to the input element
type InputElementSpecificProps = React.InputHTMLAttributes<HTMLInputElement> & {
  as?: "input"; // Discriminating property
};

// Props specific to the textarea element
type TextareaElementSpecificProps =
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    as: "textarea"; // Discriminating property
  };

// Discriminated union type for the Input component props
export type InputProps = BaseElementProps &
  (InputElementSpecificProps | TextareaElementSpecificProps);

function Input({ className, as = "input", ...props }: InputProps) {
  // Base classes applied to both input and textarea
  const baseClasses = cn(
    "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
    "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
    "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
    // Conditional styling based on the component type
    as === "input"
      ? "h-9 file:h-7 file:text-foreground file:inline-flex file:border-0 file:bg-transparent file:text-sm file:font-medium" // Input specific styles
      : "min-h-9 py-2", // Textarea specific styles (adjust height/padding)
    className, // Allow overriding classes
  );

  // Render based on the 'as' prop using the discriminated union
  if (as === "textarea") {
    // Props are now correctly typed as TextareaElementSpecificProps
    // We can safely cast the spread props after separating the discriminator
    const { as: _, ...rest } = props as TextareaElementSpecificProps;
    return (
      <textarea
        data-slot="input"
        className={baseClasses}
        {...rest} // Spread the correctly typed textarea props
      />
    );
  }

  // Default to input element
  // Props are now correctly typed as InputElementSpecificProps
  // We can safely cast the spread props
  const { as: _, ...rest } = props as InputElementSpecificProps;
  return (
    <input
      data-slot="input"
      className={baseClasses}
      {...rest} // Spread the correctly typed input props
      // Explicitly set type, defaulting to 'text' if not provided
      type={rest.type ?? "text"}
    />
  );
}

export { Input };
