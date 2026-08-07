import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "lumina_client_id";

export async function getClientId(): Promise<string> {
  let id = await AsyncStorage.getItem(STORAGE_KEY);

  if (!id) {
    const random = Math.random().toString(36).slice(2);
    id = `lumina_mobile_${Date.now()}_${random}`;
    await AsyncStorage.setItem(STORAGE_KEY, id);
  }

  return id;
}

