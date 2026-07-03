import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, withSpring } from 'react-native-reanimated';

interface BarChartProps {
  data: number[];
  labels: string[];
  height?: number;
  color?: string;
}

export function BarChart({ data, labels, height = 150, color = '#a78bfa' }: BarChartProps) {
  const max = Math.max(...data, 1);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <View style={[styles.container, { height }]}>
      {/* Horizontal grid lines */}
      <View style={styles.gridContainer}>
        {[0, 25, 50, 75, 100].map((val, idx) => (
          <View 
            key={idx} 
            style={[
              styles.gridLine, 
              { bottom: `${val}%` }
            ]} 
          />
        ))}
      </View>

      {/* Bars Container */}
      <View style={styles.barsContainer}>
        {data.map((value, index) => (
          <ChartBar 
            key={index} 
            value={value} 
            max={max} 
            height={height - 30} 
            color={color} 
            index={index} 
            isActive={activeIndex === index}
            onPress={() => setActiveIndex(activeIndex === index ? null : index)}
            dataLength={data.length}
          />
        ))}
      </View>

      {/* X Axis Labels */}
      <View style={styles.labelsContainer}>
        {labels.length > 2 ? (
          labels.map((label, idx) => (
            <Text key={idx} style={styles.labelText}>
              {label}
            </Text>
          ))
        ) : (
          <View style={styles.labelBetween}>
            <Text style={styles.labelText}>{labels[0]}</Text>
            <Text style={styles.labelText}>{labels[1]}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function ChartBar({ value, max, height, color, index, isActive, onPress, dataLength }: { value: number, max: number, height: number, color: string, index: number, isActive: boolean, onPress: () => void, dataLength: number }) {
  const animatedHeight = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    const targetHeight = (value / max) * height;
    animatedHeight.value = withDelay(index * (dataLength > 10 ? 15 : 60), withTiming(targetHeight, { duration: 600 }));
  }, [value, max, height, index, dataLength]);

  useEffect(() => {
    scale.value = withSpring(isActive ? 1.15 : 1);
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      height: animatedHeight.value,
      transform: [{ scale: scale.value }],
    };
  });

  const marginHorizontal = dataLength > 10 ? 1.5 : 4;

  return (
    <TouchableOpacity 
      style={[styles.barWrapper, { marginHorizontal }]} 
      onPress={onPress}
      activeOpacity={0.8}
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
    width: '100%',
    position: 'relative',
    justifyContent: 'flex-end',
  },
  gridContainer: {
    ...StyleSheet.absoluteFill,
    bottom: 25,
    justifyContent: 'space-between',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: '80%',
    paddingHorizontal: 10,
    zIndex: 10,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
    position: 'relative',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 2,
  },
  tooltip: {
    position: 'absolute',
    top: -30,
    backgroundColor: '#0f172a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#c084fc',
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  tooltipText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    height: 25,
    alignItems: 'center',
    marginTop: 8,
  },
  labelBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  labelText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
  },
});
