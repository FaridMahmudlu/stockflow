import React, { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, withDelay, withSpring } from 'react-native-reanimated';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';

interface MiniChartProps {
  data: number[];
  height?: number;
  color?: string;
}

export function MiniChart({ data, height = 100, color = '#a78bfa' }: MiniChartProps) {
  const max = Math.max(...data, 1);
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  const marginHorizontal = data.length > 10 ? 1.5 : 4;

  return (
    <View style={[styles.container, { height }]}>
      {data.map((value, index) => {
        return (
          <ChartBar 
            key={index} 
            value={value} 
            max={max} 
            height={height} 
            color={color} 
            index={index} 
            isActive={activeIndex === index}
            onPress={() => setActiveIndex(activeIndex === index ? null : index)}
            marginHorizontal={marginHorizontal}
            dataLength={data.length}
          />
        );
      })}
    </View>
  );
}

function ChartBar({ value, max, height, color, index, isActive, onPress, marginHorizontal, dataLength }: { value: number, max: number, height: number, color: string, index: number, isActive: boolean, onPress: () => void, marginHorizontal: number, dataLength: number }) {
  const animatedHeight = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    const targetHeight = (value / max) * height;
    animatedHeight.value = withDelay(index * (dataLength > 10 ? 15 : 80), withTiming(targetHeight, { duration: 600 }));
  }, [value, max, height, index]);

  useEffect(() => {
    scale.value = withSpring(isActive ? 1.1 : 1);
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      height: animatedHeight.value,
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <TouchableOpacity 
      style={[styles.barContainer, { marginHorizontal }]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      {isActive && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipText}>{value}</Text>
        </View>
      )}
      <Animated.View 
        style={[
          styles.bar, 
          { backgroundColor: isActive ? '#c084fc' : color }, 
          animatedStyle
        ]} 
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: 10,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 4,
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 2,
  },
  tooltip: {
    position: 'absolute',
    top: -25,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 10,
  },
  tooltipText: {
    color: '#0f172a',
    fontSize: 10,
    fontWeight: 'bold',
  }
});
