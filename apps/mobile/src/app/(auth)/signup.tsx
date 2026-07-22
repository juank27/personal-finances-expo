import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { supabase } from "@/lib/supabase";

export default function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    setIsSubmitting(false);
    if (error) setError(error.message);
  }

  return (
    <View className="flex-1 justify-center gap-4 bg-white px-6">
      <Text className="mb-2 text-3xl font-bold">Crear cuenta</Text>

      <TextInput
        className="rounded-lg border border-gray-300 px-4 py-3"
        placeholder="Nombre completo"
        value={fullName}
        onChangeText={setFullName}
      />
      <TextInput
        className="rounded-lg border border-gray-300 px-4 py-3"
        placeholder="Correo"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        className="rounded-lg border border-gray-300 px-4 py-3"
        placeholder="Contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error ? <Text className="text-red-600">{error}</Text> : null}

      <Pressable
        className="rounded-lg bg-black py-3"
        disabled={isSubmitting}
        onPress={handleSubmit}
      >
        <Text className="text-center font-semibold text-white">
          {isSubmitting ? "Creando…" : "Crear cuenta"}
        </Text>
      </Pressable>

      <Link href="/login" className="text-center text-blue-600">
        ¿Ya tienes cuenta? Inicia sesión
      </Link>
    </View>
  );
}
