import * as ImagePicker from 'expo-image-picker';

export async function pickProfilePhoto(): Promise<{ uri: string; mime: string; fileSize?: number } | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Allow photo library access to set a profile photo.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const mime = asset.mimeType ?? mimeFromUri(asset.uri);
  if (!mime) {
    throw new Error('Use a JPEG, PNG, or WebP image.');
  }
  return { uri: asset.uri, mime, fileSize: asset.fileSize };
}

function mimeFromUri(uri: string): string | null {
  const path = uri.split('?')[0].toLowerCase();
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.webp')) return 'image/webp';
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
  return null;
}
