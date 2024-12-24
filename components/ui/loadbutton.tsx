import { AnimatePresence, motion } from "framer-motion";
import { useState, ReactNode } from "react";
import { Check, Loader, X, LucideIcon } from "lucide-react";

export const Example = () => {
  return (
    <div className="grid min-h-[200px] place-content-center bg-neutral-900 p-4">
      <LoadAndErrorButton onClick={() => {}} text="Click Me and Wait" />
    </div>
  );
};

interface LoadAndErrorButtonProps {
  onClick: () => void;
  disabled?: boolean;
  variant?: "neutral" | "loading" | "error" | "success";
  text: string;
  icon?: ReactNode;
}

export const LoadAndErrorButton = ({ 
  onClick, 
  disabled = false, 
  variant = "neutral",
  text,
  icon
}: LoadAndErrorButtonProps) => {
  const classNames =
    variant === "neutral"
      ? "bg-primary hover:bg-primary/90"
      : variant === "error"
        ? "bg-red-500"
        : variant === "success"
          ? "bg-green-500"
          : "bg-primary/70 pointer-events-none";

  return (
    <motion.button
      disabled={disabled || variant !== "neutral"}
      onClick={onClick}
      className={`relative rounded-md px-4 py-2 font-medium text-white transition-all ${classNames}`}
    >
      <motion.span
        animate={{
          y: variant === "neutral" ? 0 : 6,
          opacity: variant === "neutral" ? 1 : 0,
        }}
        className="inline-flex items-center gap-2"
      >
        {icon}
        {text}
      </motion.span>
      <IconOverlay Icon={Loader} visible={variant === "loading"} spin />
      <IconOverlay Icon={X} visible={variant === "error"} />
      <IconOverlay Icon={Check} visible={variant === "success"} />
    </motion.button>
  );
};

const IconOverlay = ({
  Icon,
  visible,
  spin = false,
}: {
  Icon: LucideIcon;
  visible: boolean;
  spin?: boolean;
}) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{
            y: -12,
            opacity: 0,
          }}
          animate={{
            y: 0,
            opacity: 1,
          }}
          exit={{
            y: 12,
            opacity: 0,
          }}
          className="absolute inset-0 grid place-content-center"
        >
          <Icon className={`w-5 h-5 duration-300 ${spin && "animate-spin"}`} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};