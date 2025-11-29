export interface ColorPalette {
    primary: string;
    secondary: string;
    tertiary: string;
    background: string;
    text: string;
    isMonochrome: boolean;
    brightness: number; // 0-1
    saturation: number; // 0-1
    colors: string[]; // Full palette
}
