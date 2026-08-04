import { Switch as RNSwitch, type SwitchProps as RNSwitchProps } from "react-native";

export function Switch(props: RNSwitchProps) {
  return <RNSwitch trackColor={{ false: "#D1D5DB", true: "#4F46E5" }} thumbColor="#FFFFFF" {...props} />;
}
