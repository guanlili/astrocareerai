import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-paper group-[.toaster]:text-ink group-[.toaster]:border-2 group-[.toaster]:border-ink group-[.toaster]:!rounded-none group-[.toaster]:shadow-[6px_6px_0_var(--ink)]",
          description: "group-[.toast]:text-[var(--text-muted)]",
          actionButton:
            "group-[.toast]:bg-accent group-[.toast]:text-white group-[.toast]:!rounded-none group-[.toast]:font-bold",
          cancelButton:
            "group-[.toast]:bg-surface-2 group-[.toast]:text-ink group-[.toast]:!rounded-none group-[.toast]:font-bold",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
