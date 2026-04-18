interface LaunchAppButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export default function LaunchAppButton({ className, children }: LaunchAppButtonProps) {
  const handleClick = () => {
    if (window.navigator.userAgent.includes("Electron")) {
      window.location.hash = "#/dashboard";
    } else {
      window.location.href = "/auth";
    }
  };

  return (
    <button onClick={handleClick} className={className}>
      {children || "Launch App"}
    </button>
  );
}
