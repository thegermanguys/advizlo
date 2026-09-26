import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';

export default function ProfilePhoto({
  name,
  uri,
  size = 48,
}: {
  name: string;
  uri: string | null;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        accessibilityLabel={`${name} profile photo`}
        onError={() => setFailed(true)}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#5798D4' }}
      />
    );
  }

  return (
    <View
      accessibilityLabel={`${name} profile photo`}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#5798D4',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: Math.max(12, Math.round(size * 0.34)) }}>
        {initialsFrom(name)}
      </Text>
    </View>
  );
}

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
