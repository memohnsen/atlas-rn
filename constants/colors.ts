import { useColorScheme } from 'react-native';

export const COLORS = {
    lightBackground: '#FFFFFF',
    darkBackground: '#000000',

    // Card / Surface colors
    lightCardBackground: '#F2F2F7',
    darkCardBackground: '#1C1C1E',

    lightCardBackgroundSecondary: '#F8F8FC',
    darkCardBackgroundSecondary: '#2C2C2E',

    // Text colors
    lightTextPrimary: '#000000',
    darkTextPrimary: '#FFFFFF'
}

export const useColors = () => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    return {
        background: isDark ? COLORS.darkBackground : COLORS.lightBackground,
        cardBackground: isDark ? COLORS.darkCardBackground : COLORS.lightCardBackground,
        cardBackgroundSecondary: isDark ? COLORS.darkCardBackgroundSecondary : COLORS.lightCardBackgroundSecondary,
        textPrimary: isDark ? COLORS.darkTextPrimary : COLORS.lightTextPrimary,
    };
}
