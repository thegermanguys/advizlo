import React from 'react';
import { View, Text, Pressable } from 'react-native';

// Read-only: <StarRating value={4.3} />
// Interactive: <StarRating value={rating} onChange={setRating} />
export default function StarRating({
  value,
  onChange,
  size = 16,
}: {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
}) {
  const stars = [1, 2, 3, 4, 5];
  const interactive = !!onChange;

  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {stars.map((n) => {
        const filled = n <= Math.round(value);
        const star = (
          <Text style={{ fontSize: size, color: filled ? '#f5a623' : '#ddd', lineHeight: size + 2 }}>★</Text>
        );
        return interactive ? (
          <Pressable key={n} onPress={() => onChange!(n)}>
            {star}
          </Pressable>
        ) : (
          <View key={n}>{star}</View>
        );
      })}
    </View>
  );
}
