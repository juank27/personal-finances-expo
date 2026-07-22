import { ActivityIndicator, Pressable, Text, type PressableProps } from "react-native";

type Variant = "primary" | "danger" | "secondary";

interface ButtonProps extends Omit<PressableProps, "children"> {
  title: string;
  variant?: Variant;
  loading?: boolean;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-black",
  danger: "bg-red-600",
  secondary: "bg-gray-200",
};

const VARIANT_TEXT_CLASSES: Record<Variant, string> = {
  primary: "text-white",
  danger: "text-white",
  secondary: "text-black",
};

export function Button({
  title,
  variant = "primary",
  loading,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      className={`items-center rounded-lg py-3 ${VARIANT_CLASSES[variant]} ${isDisabled ? "opacity-50" : ""} ${className ?? ""}`}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" ? "black" : "white"} />
      ) : (
        <Text className={`font-semibold ${VARIANT_TEXT_CLASSES[variant]}`}>{title}</Text>
      )}
    </Pressable>
  );
}
