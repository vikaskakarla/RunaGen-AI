import React from "react";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    className?: string;
    width?: string | number;
    height?: string | number;
    circle?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
    className = "",
    width,
    height,
    circle = false,
    style,
    ...props
}) => {
    const styles: React.CSSProperties = {
        width: width,
        height: height,
        ...style,
    };

    const baseClasses = "animate-pulse bg-indigo-500/20 rounded-md";
    const circleClasses = circle ? "rounded-full" : "";

    return (
        <div
            className={`${baseClasses} ${circleClasses} ${className}`}
            style={styles}
            {...props}
        />
    );
};
