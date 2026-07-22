import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";

import { apiFetch } from "@/lib/api-client";

export default function Index() {
  const health = useQuery({
    queryKey: ["health"],
    queryFn: () => apiFetch<{ data: { status: string } }>("/health"),
  });

  return (
    <View className="flex-1 items-center justify-center gap-3 bg-white">
      <Text className="text-2xl font-bold">Finanzas Personales</Text>
      <Text>
        Backend:{" "}
        {health.isLoading
          ? "conectando…"
          : health.isError
            ? "sin conexión"
            : health.data?.data.status}
      </Text>
    </View>
  );
}
