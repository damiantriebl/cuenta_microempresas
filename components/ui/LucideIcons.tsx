import { TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface IconProps {
    size?: number;
    color?: string;
    onPress?: () => void;
}

// Componente genérico para íconos con TouchableOpacity opcional
export const AppIcon = ({
    name,
    size = 24,
    color = '#333',
    onPress
}: {
    name: keyof typeof Ionicons.glyphMap;
    size?: number;
    color?: string;
    onPress?: () => void;
}) => {
    const icon = <Ionicons name={name} size={size} color={color} />;

    if (onPress) {
        return (
            <TouchableOpacity onPress={onPress} style={{ padding: 4 }}>
                {icon}
            </TouchableOpacity>
        );
    }

    return icon;
};

// Íconos necesarios para la aplicación con equivalentes de Ionicons
export const AppIcons = {
    // Navegación y UI
    Bell: (props: IconProps) => <AppIcon name="notifications-outline" {...props} />,
    BellRing: (props: IconProps) => <AppIcon name="notifications" {...props} />,
    Home: (props: IconProps) => <AppIcon name="home-outline" {...props} />,
    User: (props: IconProps) => <AppIcon name="person-outline" {...props} />,
    Users: (props: IconProps) => <AppIcon name="people-outline" {...props} />,
    Settings: (props: IconProps) => <AppIcon name="settings-outline" {...props} />,
    Menu: (props: IconProps) => <AppIcon name="menu-outline" {...props} />,
    Search: (props: IconProps) => <AppIcon name="search-outline" {...props} />,

    // Acciones
    Plus: (props: IconProps) => <AppIcon name="add-outline" {...props} />,
    Edit: (props: IconProps) => <AppIcon name="create-outline" {...props} />,
    Trash2: (props: IconProps) => <AppIcon name="trash-outline" {...props} />,
    Check: (props: IconProps) => <AppIcon name="checkmark-outline" {...props} />,
    X: (props: IconProps) => <AppIcon name="close-outline" {...props} />,
    Refresh: (props: IconProps) => <AppIcon name="refresh-outline" {...props} />,

    // Navegación
    ChevronRight: (props: IconProps) => <AppIcon name="chevron-forward-outline" {...props} />,
    ChevronLeft: (props: IconProps) => <AppIcon name="chevron-back-outline" {...props} />,
    ChevronUp: (props: IconProps) => <AppIcon name="chevron-up-outline" {...props} />,
    ChevronDown: (props: IconProps) => <AppIcon name="chevron-down-outline" {...props} />,

    // Negocio
    Building2: (props: IconProps) => <AppIcon name="business-outline" {...props} />,
    ShoppingCart: (props: IconProps) => <AppIcon name="cart-outline" {...props} />,
    DollarSign: (props: IconProps) => <AppIcon name="cash-outline" {...props} />,
    TrendingUp: (props: IconProps) => <AppIcon name="trending-up-outline" {...props} />,
    Package: (props: IconProps) => <AppIcon name="cube-outline" {...props} />,
    Receipt: (props: IconProps) => <AppIcon name="receipt-outline" {...props} />,
    Calculator: (props: IconProps) => <AppIcon name="calculator-outline" {...props} />,

    // Comunicación
    Mail: (props: IconProps) => <AppIcon name="mail-outline" {...props} />,
    Phone: (props: IconProps) => <AppIcon name="call-outline" {...props} />,

    // Estados
    AlertCircle: (props: IconProps) => <AppIcon name="alert-circle-outline" {...props} />,
    CheckCircle: (props: IconProps) => <AppIcon name="checkmark-circle-outline" {...props} />,
    Info: (props: IconProps) => <AppIcon name="information-circle-outline" {...props} />,

    // Tiempo
    Calendar: (props: IconProps) => <AppIcon name="calendar-outline" {...props} />,
    Clock: (props: IconProps) => <AppIcon name="time-outline" {...props} />,

    // Archivos y datos
    FileText: (props: IconProps) => <AppIcon name="document-text-outline" {...props} />,
    Download: (props: IconProps) => <AppIcon name="download-outline" {...props} />,
    Upload: (props: IconProps) => <AppIcon name="cloud-upload-outline" {...props} />,
    Share: (props: IconProps) => <AppIcon name="share-outline" {...props} />,

    // Filtros y ordenamiento
    Filter: (props: IconProps) => <AppIcon name="filter-outline" {...props} />,
    Sort: (props: IconProps) => <AppIcon name="swap-vertical-outline" {...props} />,

    // Más opciones
    MoreVertical: (props: IconProps) => <AppIcon name="ellipsis-vertical-outline" {...props} />,

    // Favoritos
    Star: (props: IconProps) => <AppIcon name="star-outline" {...props} />,
    Heart: (props: IconProps) => <AppIcon name="heart-outline" {...props} />,

    // Seguridad
    Lock: (props: IconProps) => <AppIcon name="lock-closed-outline" {...props} />,
    Unlock: (props: IconProps) => <AppIcon name="lock-open-outline" {...props} />,
    Shield: (props: IconProps) => <AppIcon name="shield-outline" {...props} />,

    // Visibilidad
    Eye: (props: IconProps) => <AppIcon name="eye-outline" {...props} />,
    EyeOff: (props: IconProps) => <AppIcon name="eye-off-outline" {...props} />,
};

// Componente individual para facilidad de uso
export const IonIcon = AppIcon;

export default AppIcons;