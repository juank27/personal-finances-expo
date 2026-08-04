import { cva, type VariantProps } from "class-variance-authority";
import { ActivityIndicator, Pressable, Text, type PressableProps } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { cn } from "@/lib/utils";

const buttonVariants = cva("flex-row items-center justify-center rounded-lg", {
  variants: {
    variant: {
      primary: "bg-primary",
      danger: "bg-danger",
      secondary: "bg-muted",
    },
    size: {
      default: "px-4 py-3",
      sm: "px-3 py-2",
    },
  },
  defaultVariants: { variant: "primary", size: "default" },
});

const buttonTextVariants = cva("font-semibold", {
  variants: {
    variant: {
      primary: "text-primary-foreground",
      danger: "text-danger-foreground",
      secondary: "text-foreground",
    },
  },
  defaultVariants: { variant: "primary" },
});

export interface ButtonProps
  extends Omit<PressableProps, "children">,
    VariantProps<typeof buttonVariants> {
  title: string;
  loading?: boolean;
}

export function Button({
  title,
  variant,
  size,
  loading,
  disabled,
  className,
  onPressIn,
  onPressOut,
  ...props
}: ButtonProps) {
  const scale = useSharedValue(1);
  // The scale transform lives on a plain Animated.View wrapper, not on the Pressable itself:
  // react-native-css-interop only patches className support onto the exact Pressable/View
  // references it registers — a component created via Animated.createAnimatedComponent is a
  // new reference and isn't guaranteed to keep className→style translation.
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const isDisabled = disabled || loading;

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        className={cn(buttonVariants({ variant, size }), isDisabled && "opacity-50", className)}
        disabled={isDisabled}
        onPressIn={(e) => {
          scale.value = withSpring(0.96);
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          scale.value = withSpring(1);
          onPressOut?.(e);
        }}
        {...props}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className={cn(buttonTextVariants({ variant }))}>{title}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}
