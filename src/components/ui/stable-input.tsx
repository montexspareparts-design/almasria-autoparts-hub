import * as React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/**
 * StableInput / StableTextarea
 *
 * Native WebViews (Android Gboard / iOS Arabic IME) lose characters when a
 * controlled React input is re-rendered while the IME still holds a composing
 * region. These wrappers keep the DOM value uncontrolled (the browser owns the
 * text), report changes upward, and only force the DOM value when the parent
 * resets it from the outside while the field is NOT focused.
 */

type BaseProps = {
  value: string;
  onValueChange: (v: string) => void;
};

export const StableInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<typeof Input>, "value" | "onChange"> & BaseProps
>(({ value, onValueChange, ...props }, ref) => {
  const innerRef = React.useRef<HTMLInputElement | null>(null);
  const composing = React.useRef(false);

  React.useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    if (document.activeElement === el || composing.current) return;
    if (el.value !== value) el.value = value ?? "";
  }, [value]);

  return (
    <Input
      {...props}
      defaultValue={value}
      ref={(node) => {
        innerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
      }}
      onCompositionStart={() => {
        composing.current = true;
      }}
      onCompositionEnd={(e) => {
        composing.current = false;
        onValueChange((e.target as HTMLInputElement).value);
      }}
      onChange={(e) => {
        if (composing.current) return;
        onValueChange(e.target.value);
      }}
    />
  );
});
StableInput.displayName = "StableInput";

export const StableTextarea = React.forwardRef<
  HTMLTextAreaElement,
  Omit<React.ComponentProps<typeof Textarea>, "value" | "onChange"> & BaseProps
>(({ value, onValueChange, ...props }, ref) => {
  const innerRef = React.useRef<HTMLTextAreaElement | null>(null);
  const composing = React.useRef(false);

  React.useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    if (document.activeElement === el || composing.current) return;
    if (el.value !== value) el.value = value ?? "";
  }, [value]);

  return (
    <Textarea
      {...props}
      defaultValue={value}
      ref={(node) => {
        innerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
      }}
      onCompositionStart={() => {
        composing.current = true;
      }}
      onCompositionEnd={(e) => {
        composing.current = false;
        onValueChange((e.target as HTMLTextAreaElement).value);
      }}
      onChange={(e) => {
        if (composing.current) return;
        onValueChange(e.target.value);
      }}
    />
  );
});
StableTextarea.displayName = "StableTextarea";
