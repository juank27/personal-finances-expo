import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useColorScheme } from "nativewind";

import { THEME_COLORS } from "@/lib/theme-colors";

// `navigation.popToTop()` from a Tabs.Screen's `listeners` targets the Tab navigator
// itself, which isn't a stack and doesn't handle POP_TO_TOP ("action was not handled by
// any navigator"). The nested Stack that actually needs resetting lives one level down, as
// that tab's own route state — so the action must be dispatched with an explicit `target`
// pointing at that nested navigator's key instead. Typed structurally (not imported from
// @react-navigation/native, which isn't a direct dependency here) against just the two
// methods this needs.
interface TabNavigation {
  getState: () => {
    routes: Array<{ name: string; state?: { index: number; key: string } }>;
  };
  dispatch: (action: { type: string; target: string }) => void;
}

function resetTabStack(navigation: TabNavigation, routeName: string) {
  const tabRoute = navigation.getState().routes.find((route) => route.name === routeName);
  const nestedState = tabRoute?.state;

  if (nestedState && nestedState.index > 0) {
    navigation.dispatch({ type: "POP_TO_TOP", target: nestedState.key });
  }
}

export default function AppLayout() {
  const { colorScheme } = useColorScheme();
  const theme = THEME_COLORS[colorScheme ?? "light"];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.tabBarActive,
        tabBarInactiveTintColor: theme.tabBarInactive,
        tabBarStyle: { backgroundColor: theme.card, borderTopColor: theme.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Resumen",
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Transacciones",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="swap-horizontal-outline" size={size} color={color} />
          ),
        }}
        // Tapping the tab always resets its nested Stack back to the list. Create/edit now
        // live as root-level modals (see app/transaction/*) rather than nested screens here,
        // so this is mostly a safety net today — kept in case something else ever pushes
        // onto this tab's own stack and is left without navigating back.
        listeners={({ navigation }) => ({
          tabPress: () => resetTabStack(navigation, "transactions"),
        })}
      />
      <Tabs.Screen
        name="budgets"
        options={{
          title: "Presupuestos",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pie-chart-outline" size={size} color={color} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: () => resetTabStack(navigation, "budgets"),
        })}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: "Categorías",
          headerStyle: { backgroundColor: theme.card },
          headerTintColor: theme.foreground,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pricetag-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Cuenta",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
