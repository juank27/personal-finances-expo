import { useForm } from "@tanstack/react-form";
import { Link } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInUp, FadeOut } from "react-native-reanimated";
import { z } from "zod";

import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

const emailSchema = z.string().email({ message: "Correo inválido" });
const passwordSchema = z.string().min(6, { message: "Mínimo 6 caracteres" });

export default function Signup() {
  const [formError, setFormError] = useState<string | null>(null);

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
    <View className="flex-1 justify-center gap-4 bg-background px-6">
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
  );
}
