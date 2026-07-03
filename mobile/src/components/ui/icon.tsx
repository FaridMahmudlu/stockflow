import React from 'react';
import { useAppTheme } from '../../theme/ThemeProvider';
import { Feather } from '@expo/vector-icons';

export type IconName = 
  | 'House'
  | 'Cube'
  | 'ArrowsDownUp'
  | 'Buildings'
  | 'Bell'
  | 'BellSlash'
  | 'User'
  | 'ShieldCheck'
  | 'Shield'
  | 'Key'
  | 'CaretRight'
  | 'Fingerprint'
  | 'DeviceMobile'
  | 'List'
  | 'FileText'
  | 'EnvelopeSimple'
  | 'Globe'
  | 'MagnifyingGlass'
  | 'Plus'
  | 'Funnel'
  | 'DotsThreeVertical'
  | 'PencilSimple'
  | 'Trash'
  | 'ArrowUp'
  | 'ArrowDown'
  | 'X'
  | 'Check'
  | 'WarningCircle'
  | 'Gear'
  | 'SignOut'
  | 'Calendar'
  | 'Copy'
  | 'Camera'
  | 'ChartBar'
  | 'Info'
  | 'LockKey'
  | 'CheckCircle'
  | 'XCircle'
  | 'Sun'
  | 'Moon'
  | 'Stack'
  | 'Phone'
  | 'CaretDown'
  | 'ArrowLeft'
  | 'Truck'
  | 'Money'
  | 'Barcode'
  | 'SignIn'
  | 'GridFour'
  | 'ArrowsLeftRight'
  | 'Basket'
  | 'Scales'
  | 'Drop'
  | 'ArrowsOut'
  | 'MapPin'
  | 'Users'
  | 'ShareNetwork'
  | 'Clock'
  | 'TextT'
  | 'TrendDown'
  | 'TrendUp'
  | 'ArrowCircleDown'
  | 'ArrowCircleUp'
  | 'ArrowsClockwise'
  | (string & {});

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
  style?: any;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color,
  weight = 'regular',
  style,
}) => {
  const { colors } = useAppTheme();
  const iconColor = color || colors.icon.primary;

  const featherMap: Record<string, string> = {
    // PascalCase mappings
    House: 'home',
    Cube: 'box',
    ArrowsDownUp: 'sliders',
    Buildings: 'briefcase',
    Bell: 'bell',
    BellSlash: 'bell-off',
    User: 'user',
    ShieldCheck: 'shield',
    Shield: 'shield',
    Key: 'key',
    CaretRight: 'chevron-right',
    Fingerprint: 'lock',
    DeviceMobile: 'smartphone',
    List: 'list',
    FileText: 'file-text',
    EnvelopeSimple: 'mail',
    Globe: 'globe',
    MagnifyingGlass: 'search',
    Plus: 'plus',
    Funnel: 'filter',
    DotsThreeVertical: 'more-vertical',
    PencilSimple: 'edit-2',
    Trash: 'trash-2',
    ArrowUp: 'arrow-up',
    ArrowDown: 'arrow-down',
    X: 'x',
    Check: 'check',
    WarningCircle: 'alert-circle',
    Gear: 'settings',
    SignOut: 'log-out',
    Calendar: 'calendar',
    Copy: 'copy',
    Camera: 'camera',
    ChartBar: 'bar-chart-2',
    Info: 'info',
    LockKey: 'lock',
    CheckCircle: 'check-circle',
    XCircle: 'x-circle',
    Sun: 'sun',
    Moon: 'moon',
    Stack: 'layers',
    Phone: 'phone',
    CaretDown: 'chevron-down',
    ArrowLeft: 'arrow-left',
    Truck: 'truck',
    Money: 'dollar-sign',
    Barcode: 'maximize',
    SignIn: 'log-in',
    GridFour: 'grid',
    ArrowsLeftRight: 'repeat',
    Basket: 'shopping-bag',
    Scales: 'sliders',
    Drop: 'droplet',
    ArrowsOut: 'maximize-2',
    MapPin: 'map-pin',
    Users: 'users',
    ShareNetwork: 'share-2',
    Clock: 'clock',
    TextT: 'type',
    TrendDown: 'trending-down',
    TrendUp: 'trending-up',
    ArrowCircleDown: 'arrow-down-circle',
    ArrowCircleUp: 'arrow-up-circle',
    ArrowsClockwise: 'refresh-cw',

    // Lowercase/kebab-case legacy Ionicons mappings
    'arrow-back': 'arrow-left',
    'grid-four': 'grid',
    'arrow-circle-up': 'arrow-up-circle',
    'arrow-circle-down': 'arrow-down-circle',
    'arrows-clockwise': 'refresh-cw',
    'arrow-down-up': 'sliders',
    'swap-vertical': 'refresh-cw',
    'chevron-down': 'chevron-down',
    'chevron-right': 'chevron-right',
    'document-text': 'file-text',
    'shield-check': 'shield',
    'check-circle': 'check-circle',
    'close-circle': 'x-circle',
    'more-vertical': 'more-vertical',
    'text-t': 'type',
    'device-mobile': 'smartphone',
    close: 'x',
    add: 'plus',
    home: 'home',
    cube: 'box',
    business: 'briefcase',
    notifications: 'bell',
    person: 'user',
    search: 'search',
    filter: 'filter',
    edit: 'edit-2',
    trash: 'trash-2',
    settings: 'settings',
    info: 'info',
    calendar: 'calendar',
    clock: 'clock',
    phone: 'phone',
    mail: 'mail',
    globe: 'globe',
    lock: 'lock',
    shield: 'shield',
    key: 'key',
    fingerprint: 'lock',
    alert: 'alert-circle',
    chart: 'bar-chart-2',
    logout: 'log-out',
    'notifications-off': 'bell-off',
  };

  const resolvedName = featherMap[name] || name;

  return <Feather name={resolvedName as any} size={size} color={iconColor} style={style} />;
};
