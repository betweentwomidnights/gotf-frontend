import { ReactNode, useCallback, useEffect, useState } from "react";
import {
    ColorMode,
    ColorModeContext,
    ColorModeScript,
    CSSReset,
    extendTheme,
    GlobalStyle,
    ThemeProvider
} from "@chakra-ui/react";

const theme = extendTheme();

const getCurrentTheme = () => {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return isDark ? "dark" : "light";
};

type CustomChakraProviderProps = {
    shadowRootId: string;
    children: ReactNode;
};
export default function CustomChakraProvider({ children, shadowRootId }: CustomChakraProviderProps) {
    const [colorMode, setColorMode] = useState<ColorMode>(getCurrentTheme());

    useEffect(() => {
        const darkThemeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const onChangeColorSchema = (event: MediaQueryListEvent) => {
            const isDark = event.matches;
            setColorMode(isDark ? "dark" : "light");
        };

        darkThemeMediaQuery.addEventListener("change", onChangeColorSchema);

        return () => {
            darkThemeMediaQuery.removeEventListener("change", onChangeColorSchema);
        };
    }, []);

    const toggleColorMode = useCallback(() => {
        setColorMode(prev => (prev === "dark" ? "light" : "dark"));
    }, []);

    return (
        <ThemeProvider theme={theme} cssVarsRoot={`#${shadowRootId}`}>
            <ColorModeScript initialColorMode="system" />
            <ColorModeContext.Provider value={{ colorMode, setColorMode, toggleColorMode }}>
                <CSSReset />
                <GlobalStyle />
                {children}
            </ColorModeContext.Provider>
        </ThemeProvider>
    );
}