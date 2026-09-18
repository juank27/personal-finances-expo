import { TextClassContext } from '@/components/ui/text';
import { THEME_COLORS } from '@/lib/theme-colors';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { ActivityIndicator, Platform, Pressable, Text as RNText } from 'react-native';

const buttonVariants = cva(
  cn(
    'group shrink-0 flex-row items-center justify-center gap-2 rounded-md shadow-none',
    Platform.select({
      web: "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive whitespace-nowrap outline-none transition-all focus-visible:ring-[3px] disabled:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
    })
  ),
  {
    variants: {
      variant: {
        default: cn(
          'bg-primary active:bg-primary/90 shadow-sm shadow-black/5',
          Platform.select({ web: 'hover:bg-primary/90' })
        ),
        destructive: cn(
          'bg-destructive active:bg-destructive/90 dark:bg-destructive/60 shadow-sm shadow-black/5',
          Platform.select({
            web: 'hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40',
          })
        ),
        outline: cn(
          'border-border bg-background active:bg-accent dark:bg-input/30 dark:border-input dark:active:bg-input/50 border shadow-sm shadow-black/5',
          Platform.select({
            web: 'hover:bg-accent dark:hover:bg-input/50',
          })
        ),
        secondary: cn(
          'bg-secondary active:bg-secondary/80 shadow-sm shadow-black/5',
          Platform.select({ web: 'hover:bg-secondary/80' })
        ),
        ghost: cn(
          'active:bg-accent dark:active:bg-accent/50',
          Platform.select({ web: 'hover:bg-accent dark:hover:bg-accent/50' })
        ),
        link: '',
      },
      size: {
        default: cn('h-10 px-4 py-2 sm:h-9', Platform.select({ web: 'has-[>svg]:px-3' })),
        sm: cn('h-9 gap-1.5 rounded-md px-3 sm:h-8', Platform.select({ web: 'has-[>svg]:px-2.5' })),
        lg: cn('h-11 rounded-md px-6 sm:h-10', Platform.select({ web: 'has-[>svg]:px-4' })),
        icon: 'h-10 w-10 sm:h-9 sm:w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

const buttonTextVariants = cva(
  cn(
    'text-foreground text-sm font-medium',
    Platform.select({ web: 'pointer-events-none transition-colors' })
  ),
  {
    variants: {
      variant: {
        default: 'text-primary-foreground',
        destructive: 'text-white',
        outline: cn(
          'group-active:text-accent-foreground',
          Platform.select({ web: 'group-hover:text-accent-foreground' })
        ),
        secondary: 'text-secondary-foreground',
        ghost: 'group-active:text-accent-foreground',
        link: cn(
          'text-primary group-active:underline',
          Platform.select({ web: 'underline-offset-4 hover:underline group-hover:underline' })
        ),
      },
      size: {
        default: '',
        sm: '',
        lg: '',
        icon: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

// Back-compat for call sites written before the react-native-reusables migration, which
// used `variant="primary" | "secondary" | "danger"` and a `title`/`loading` prop pair
// instead of children. New code should prefer the RNR-native variant names and children.
const LEGACY_VARIANT_ALIASES = { primary: 'default', danger: 'destructive' } as const;

type RnrVariant = NonNullable<VariantProps<typeof buttonVariants>['variant']>;
type LegacyVariant = keyof typeof LEGACY_VARIANT_ALIASES;

type ButtonProps = Omit<React.ComponentProps<typeof Pressable>, 'children'> &
  React.RefAttributes<typeof Pressable> &
  Omit<VariantProps<typeof buttonVariants>, 'variant'> & {
    variant?: RnrVariant | LegacyVariant;
    title?: string;
    loading?: boolean;
    children?: React.ReactNode;
  };

function Button({ className, variant, size, title, loading, disabled, children, ...props }: ButtonProps) {
  const { colorScheme } = useColorScheme();
  const resolvedVariant = (LEGACY_VARIANT_ALIASES[variant as LegacyVariant] ?? variant ?? 'default') as RnrVariant;
  const isDisabled = disabled || loading;
  const spinnerColor =
    resolvedVariant === 'secondary' || resolvedVariant === 'outline' || resolvedVariant === 'ghost'
      ? THEME_COLORS[colorScheme ?? 'light'].foreground
      : '#fff';

  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant: resolvedVariant, size })}>
      <Pressable
        className={cn(isDisabled && 'opacity-50', buttonVariants({ variant: resolvedVariant, size }), className)}
        role="button"
        disabled={isDisabled}
        {...props}>
        {loading ? (
          <ActivityIndicator color={spinnerColor} />
        ) : title ? (
          <RNText className={buttonTextVariants({ variant: resolvedVariant, size })}>{title}</RNText>
        ) : (
          children
        )}
      </Pressable>
    </TextClassContext.Provider>
  );
}

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
