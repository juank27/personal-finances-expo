import { Ionicons } from "@expo/vector-icons";
import { useForm } from "@tanstack/react-form";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { useColorScheme } from "nativewind";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInUp, FadeOut } from "react-native-reanimated";
import { z } from "zod";

import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

const emailSchema = z.string().email({ message: "Correo inválido" });
const passwordSchema = z.string().min(6, { message: "Mínimo 6 caracteres" });

// Raw colors for the subtle background gradient — LinearGradient needs real color
// strings, not Tailwind classNames, so this stays in sync by hand per color scheme.
const GRADIENT_COLORS = {
  light: ["#FFFFFF", "rgba(79,70,229,0.08)"] as const,
  dark: ["#141416", "rgba(129,140,248,0.10)"] as const,
};

export default function Signup() {
  const [formError, setFormError] = useState<string | null>(null);
  const { colorScheme } = useColorScheme();

  const form = useForm({
    defaultValues: { fullName: "", email: "", password: "" },
    onSubmit: async ({ value }) => {
      setFormError(null);
      const { error } = await supabase.auth.signUp({
        email: value.email,
        password: value.password,
        options: { data: { full_name: value.fullName } },
      });
      if (error) setFormError(error.message);
    },
  });

  return (
    <View className="flex-1 bg-background">
      <LinearGradient
        colors={GRADIENT_COLORS[colorScheme ?? "light"]}
        style={StyleSheet.absoluteFill}
      />
      <View className="flex-1 justify-center gap-4 px-6">
      <Animated.View entering={FadeInDown.duration(300)} className="mb-2 items-center gap-3">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Ionicons
            name="wallet-outline"
            size={32}
            color={colorScheme === "dark" ? "#818CF8" : "#4F46E5"}
          />
        </View>
        <Text className="text-lg font-semibold text-foreground">Finanzas</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400)}>
        <Text className="mb-2 text-3xl font-bold text-foreground">Crear cuenta</Text>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(150).duration(400)}>
        <form.Field name="fullName">
          {(field) => (
            <FormField label="Nombre completo">
              <Input value={field.state.value} onChangeText={field.handleChange} />
            </FormField>
          )}
        </form.Field>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(210).duration(400)}>
        <form.Field name="email" validators={{ onChange: emailSchema }}>
          {(field) => (
            <FormField label="Correo" error={field.state.meta.errors[0]?.message}>
              <Input
                autoCapitalize="none"
                keyboardType="email-address"
                value={field.state.value}
                onChangeText={field.handleChange}
                onBlur={field.handleBlur}
              />
            </FormField>
          )}
        </form.Field>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(270).duration(400)}>
        <form.Field name="password" validators={{ onChange: passwordSchema }}>
          {(field) => (
            <FormField label="Contraseña" error={field.state.meta.errors[0]?.message}>
              <Input
                secureTextEntry
                value={field.state.value}
                onChangeText={field.handleChange}
                onBlur={field.handleBlur}
              />
            </FormField>
          )}
        </form.Field>
      </Animated.View>

      {formError ? (
        <Animated.View entering={FadeIn} exiting={FadeOut}>
          <Text className="text-danger">{formError}</Text>
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInUp.delay(330).duration(400)}>
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button title="Crear cuenta" loading={isSubmitting} onPress={form.handleSubmit} />
          )}
        </form.Subscribe>
      </Animated.View>

      <Link href="/login" className="text-center text-primary">
        ¿Ya tienes cuenta? Inicia sesión
      </Link>
      </View>
    </View>
  );
}
