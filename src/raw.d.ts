/** Vite ?raw imports (build-time file inlining) */
declare module '*?raw' {
    const content: string;
    export default content;
}
