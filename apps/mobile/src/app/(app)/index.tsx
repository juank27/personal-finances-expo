import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

const QUICK_LINKS = [
  { href: "/transactions" as const, label: "Transacciones", hint: "Ver y agregar movimientos" },
  { href: "/budgets" as const, label: "Presupuestos", hint: "Ver progreso de gasto" },
  { href: "/categories" as const, label: "Categorías", hint: "Gestionar categorías" },
];

export default function Home() {
  const { session } = useSession();

  return (
    <View className="flex-1 gap-3 bg-white px-6 pt-6">
      <Text className="text-2xl font-bold">Finanzas Personales</Text>
      <Text className="mb-2 text-gray-500">{session?.user.email}</Text>

      {QUICK_LINKS.map((link) => (
        <Link key={link.href} href={link.href} asChild>
          <Pressable className="rounded-lg border border-gray-200 p-4">
            <Text className="text-lg font-semibold">{link.label}</Text>
            <Text className="text-gray-500">{link.hint}</Text>
          </Pressable>
        </Link>
      ))}

      <Pressable
        className="mt-4 rounded-lg bg-black px-6 py-3"
        onPress={() => supabase.auth.signOut()}
      >
        <Text className="text-center font-semibold text-white">Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}
