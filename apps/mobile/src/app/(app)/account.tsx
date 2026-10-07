import { updateProfileSchema } from "@finanzas/validators";
import { useForm } from "@tanstack/react-form";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { FormField } from "@/components/form-field";
import { SegmentedControl } from "@/components/segmented-control";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useConnectGmail, useDisconnectGmail, useEmailConnection } from "@/hooks/use-email-connection";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { useThemePreference, type ThemePreference } from "@/lib/use-theme-preference";

const THEME_OPTIONS: { label: string; value: ThemePreference }[] = [
  { label: "Claro", value: "light" },
  { label: "Oscuro", value: "dark" },
  { label: "Sistema", value: "system" },
];

function memberSinceLabel(createdAt: string): string {
  return new Intl.DateTimeFormat("es", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(createdAt)
  );
}

function ProfileForm() {
  const { session } = useSession();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { full_name: profile?.full_name ?? "" },
    onSubmit: async ({ value }) => {
      setFormError(null);
      try {
        const parsed = updateProfileSchema.parse({ full_name: value.full_name });
        await updateProfile.mutateAsync(parsed);
      } catch (err) {
        setFormError(err instanceof z.ZodError ? err.issues[0].message : "Error al guardar");
      }
    },
  });

  useEffect(() => {
    if (profile) form.setFieldValue("full_name", profile.full_name ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  if (isLoading || !profile) {
    return (
      <View className="gap-3">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-2/3 rounded-lg" />
      </View>
    );
  }

  return (
    <View className="gap-3">
      <View className="gap-1">
        <Text className="text-xs text-muted-foreground">Correo</Text>
        <Text className="text-foreground">{session?.user.email}</Text>
      </View>

      <form.Field name="full_name">
        {(field) => (
          <FormField label="Nombre completo">
            <Input value={field.state.value} onChangeText={field.handleChange} />
          </FormField>
        )}
      </form.Field>

      {formError ? <Text className="text-danger">{formError}</Text> : null}

      <Button
        title="Guardar"
        loading={updateProfile.isPending}
        onPress={form.handleSubmit}
      />

      <Text className="text-xs text-muted-foreground">
        Miembro desde {memberSinceLabel(profile.created_at)}
      </Text>
    </View>
  );
}

function lastSyncedLabel(lastSyncedAt: string | null): string {
  if (!lastSyncedAt) return "Todavía no se ha sincronizado";
  return `Última sincronización: ${new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(lastSyncedAt))}`;
}

function EmailConnectionCard() {
  const { data: connection, isLoading } = useEmailConnection();
  const connectGmail = useConnectGmail();
  const disconnectGmail = useDisconnectGmail();
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  if (isLoading || !connection) {
    return (
      <Card className="gap-3">
        <Text className="text-lg font-semibold text-foreground">Registro automático por correo</Text>
        <Skeleton className="h-10 w-full rounded-lg" />
      </Card>
    );
  }

  const needsReconnect = connection.connected && connection.status !== "active";

  return (
    <Card className="gap-3">
      <Text className="text-lg font-semibold text-foreground">Registro automático por correo</Text>
      <Text className="text-sm text-muted-foreground">
        Conecta tu Gmail para que las notificaciones de tu banco se registren solas.
      </Text>

      {!connection.connected ? (
        <Button
          title="Conectar Gmail"
          loading={connectGmail.isPending}
          onPress={() => connectGmail.mutate()}
        />
      ) : needsReconnect ? (
        <View className="gap-2">
          <Text className="text-danger">
            Se perdió el acceso a {connection.email}. Reconecta para seguir registrando movimientos.
          </Text>
          <Button
            title="Reconectar Gmail"
            loading={connectGmail.isPending}
            onPress={() => connectGmail.mutate()}
          />
        </View>
      ) : (
        <View className="gap-2">
          <Text className="text-foreground">{connection.email}</Text>
          <Text className="text-xs text-muted-foreground">
            {lastSyncedLabel(connection.last_synced_at)}
          </Text>
          <Button
            title="Desconectar"
            variant="outline"
            onPress={() => setConfirmDisconnect(true)}
          />
        </View>
      )}

      <Dialog open={confirmDisconnect} onOpenChange={setConfirmDisconnect}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desconectar Gmail</DialogTitle>
            <DialogDescription>
              Dejaremos de leer tu correo. Las transacciones ya registradas no se eliminan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" title="Cancelar" onPress={() => setConfirmDisconnect(false)} />
            <Button
              variant="destructive"
              title="Desconectar"
              loading={disconnectGmail.isPending}
              onPress={() => {
                disconnectGmail.mutate(undefined, {
                  onSuccess: () => setConfirmDisconnect(false),
                });
              }}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default function Account() {
  const { preference, setPreference } = useThemePreference();

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background">
      <ScrollView className="flex-1 px-6 pt-6" contentContainerClassName="gap-6 pb-10">
        <Text className="text-2xl font-bold text-foreground">Cuenta</Text>

        <Card className="gap-3">
          <Text className="text-lg font-semibold text-foreground">Perfil</Text>
          <ProfileForm />
        </Card>

        <EmailConnectionCard />

        <Card className="gap-3">
          <Text className="text-lg font-semibold text-foreground">Apariencia</Text>
          <SegmentedControl options={THEME_OPTIONS} value={preference} onChange={setPreference} />
        </Card>

        <Button
          title="Cerrar sesión"
          variant="outline"
          onPress={() => supabase.auth.signOut()}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
