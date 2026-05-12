import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, Environment, Float, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

interface ThreeBadgeProps {
    color: string;
    icon: React.ElementType;
    isEarned: boolean;
    name: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    earnedDate?: string;
    userName?: string;
    onClick?: () => void;
}

const BadgeMesh: React.FC<ThreeBadgeProps & { hovered: boolean }> = ({
    color,
    icon: Icon,
    isEarned,
    // name, // extracted but unused
    earnedDate,
    userName,
    hovered
}) => {
    const meshRef = useRef<THREE.Group>(null);

    // Animate rotation
    useFrame((state, delta) => {
        if (meshRef.current) {
            if (!hovered) {
                // Auto-rotate 360 degrees slowly so user can see front and back
                meshRef.current.rotation.y += delta * 0.4;
                // Slight tilt
                meshRef.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.3) * 0.1;
            } else {
                // Determine closer face and snap to it (Front or Back)
                // Normalize rotation to 0..2PI
                // const currentY = meshRef.current.rotation.y % (Math.PI * 2);

                // If current rotation is closer to PI (back), snap to back. Else snap to front.
                // Actually, simplest UX: Snap to front when hovered so they can click/read the name.
                // BUT user wants to read back.

                // New logic: On hover, pause rotation.
                // Let the user catch it? Or maybe snap to the nearest face?

                // Impl: Smoothly slow down to a stop?
                // Or just Snap to Front?
                // Ideally we want to "inspect" it.
                // Let's make it interactive: useMouse position?

                // Let's try: Snap to Front (0) normally, but if we are looking at the back, stay back?
                // To simplify: Just pause.
                // meshRef.current.rotation.y += 0;

                // Actually, let's just make it Face Front on Hover (Classic behavior)
                // AND allow seeing back by just letting it rotate when NOT hovered.
                // Wait, if it only rotates when NOT hovered, how do I read the back text?
                // I have to wait for it to spin?
                // Prompt: "whenever user unlocks the badge at backside it need to be earned by user name"

                // Better approach:
                // Hover -> Snap to Front.
                // To see back? Maybe interactive rotation is needed.
                // For now, I will use slow rotation so it's visible.

                meshRef.current.rotation.y += delta * 0.2; // Keep spinning but slower?
            }
        }
    });

    const getBadgeColor = (c: string) => {
        // Premium, slightly desaturated, deep colors for enamel look
        const colors: Record<string, string> = {
            blue: '#2563EB',    // Royal Blue
            purple: '#7C3AED',  // Deep Violet
            green: '#059669',   // Emerald
            orange: '#EA580C',  // Burnt Orange
            pink: '#DB2777',    // Deep Pink
            indigo: '#4F46E5',  // Indigo
            red: '#DC2626',     // Crimson
            yellow: '#CA8A04',  // Gold/Dark Yellow
            teal: '#0D9488',    // Teal
            cyan: '#0891B2'     // Cyan
        };
        return colors[c] || '#2563EB';
    };

    // Materials
    // Enamel: Shiny, deep color, clearcoat
    const enamelColor = isEarned ? getBadgeColor(color) : '#F1F5F9';

    // Rims: Realistic Gold or Polished Silver
    const goldColor = '#D4AF37'; // Metallic Gold
    const silverColor = '#E2E8F0'; // Polished Silver
    const rimColor = isEarned ? goldColor : silverColor;

    // Icon: White for contrast on earned, subtle grey for locked
    const iconColor = isEarned ? "#FFFFFF" : "#94A3B8";

    // Formatting Date
    const formattedDate = earnedDate ? new Date(earnedDate).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }) : 'Locked';

    return (
        <group ref={meshRef}>
            {/* Badge Body (Base Plate) */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[2.8, 2.8, 0.3, 64]} />
                <meshStandardMaterial
                    color={rimColor}
                    metalness={0.9}
                    roughness={0.2}
                />
            </mesh>

            {/* Enamel Face - Using Physical Material for Clearcoat effect */}
            <mesh position={[0, 0, 0.16]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[2.5, 2.5, 0.05, 64]} />
                <meshPhysicalMaterial
                    color={enamelColor}
                    metalness={0.2}
                    roughness={0.1}
                    clearcoat={1.0}
                    clearcoatRoughness={0.1}
                    emissive={enamelColor}
                    emissiveIntensity={isEarned ? 0.1 : 0}
                />
            </mesh>

            {/* Rim Ring - High Polish */}
            <mesh position={[0, 0, 0.16]} rotation={[0, 0, 0]}>
                <torusGeometry args={[2.65, 0.15, 32, 100]} />
                <meshStandardMaterial
                    color={rimColor}
                    metalness={1.0}
                    roughness={0.15}
                    envMapIntensity={1.5}
                />
            </mesh>

            {/* Back Face - Metal */}
            <mesh position={[0, 0, -0.16]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[2.5, 2.5, 0.05, 64]} />
                <meshStandardMaterial
                    color={rimColor}
                    metalness={0.6}
                    roughness={0.5}
                />
            </mesh>

            {/* Back Face - Enamel Inlay (Smaller) for text background */}
            <mesh position={[0, 0, -0.17]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[2.2, 2.2, 0.05, 64]} />
                <meshStandardMaterial
                    color={rimColor} // Same as metal but maybe different tone?
                    metalness={0.4}
                    roughness={0.8} // Matte for text readability
                />
            </mesh>

            {/* Icon via HTML Overlay */}
            <Html
                transform
                occlude
                position={[0, 0, 0.191]}
                style={{
                    width: '100px',
                    height: '100px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                    opacity: isEarned ? 1 : 0.4
                }}
            >
                <Icon
                    size={48}
                    color={iconColor}
                    strokeWidth={2.5}
                    style={{
                        filter: isEarned
                            ? 'drop-shadow(0px 1px 2px rgba(0,0,0,0.2))'
                            : 'none'
                    }}
                />
            </Html>

            {/* Backside Text HTML Overlay */}
            {isEarned && (
                <Html
                    transform
                    occlude="blending"
                    position={[0, 0, -0.21]} // Slightly pulled out to avoid z-fighting
                    rotation={[0, Math.PI, 0]}
                    style={{
                        width: '200px',
                        height: '200px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none',
                        backfaceVisibility: 'hidden',
                        textAlign: 'center',
                        background: 'transparent' // Explicitly straight-through
                    }}
                >
                    <div className="font-bold text-xs uppercase tracking-[0.2em] text-slate-500/80 mb-2" style={{ textShadow: '0px 1px 0px rgba(255,255,255,0.5)' }}>Earned By</div>
                    <div className="font-bold text-xl text-slate-800 mb-3 leading-tight font-serif" style={{ textShadow: '0px 1px 0px rgba(255,255,255,0.5)' }}>
                        {(() => {
                            if (userName && userName !== 'User') return userName;
                            try {
                                const local = JSON.parse(localStorage.getItem('user') || '{}');
                                return local.firstName || local.name || 'User';
                            } catch (e) { return 'User'; }
                        })()}
                    </div>
                    <div className="w-12 h-[1px] bg-slate-400/50 mb-3"></div>
                    <div className="font-medium text-[10px] text-slate-500 uppercase tracking-wider" style={{ textShadow: '0px 1px 0px rgba(255,255,255,0.5)' }}>{formattedDate}</div>
                </Html>
            )}
        </group>
    );
};

const ThreeBadge: React.FC<ThreeBadgeProps> = (props) => {
    const [hovered, setHovered] = useState(false);

    return (
        <div
            className="relative w-full h-full cursor-pointer group"
            style={{ minHeight: '180px' }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={props.onClick}
        >
            <Canvas camera={{ position: [0, 0, 10.5], fov: 42 }} dpr={[1, 2]}>
                {/* Balanced Lighting for metallic + enamel look */}
                <ambientLight intensity={0.7} />
                <spotLight
                    position={[10, 10, 10]}
                    angle={0.25}
                    penumbra={1}
                    intensity={1.5}
                    castShadow
                />
                <pointLight position={[-10, -5, -10]} intensity={0.8} color="#ffffff" />

                {/* Environment for Reflections */}
                <Environment preset="city" />

                <Float speed={2.5} rotationIntensity={0.2} floatIntensity={0.5} floatingRange={[-0.2, 0.2]}>
                    <BadgeMesh {...props} hovered={hovered} />
                </Float>

                <ContactShadows position={[0, -3.8, 0]} opacity={0.35} scale={20} blur={2.5} far={5} />
            </Canvas>
        </div>
    );
};

export default ThreeBadge;
