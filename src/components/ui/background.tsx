"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";

const Background: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let renderer: THREE.WebGLRenderer;
    let composer: EffectComposer;
    let backgroundMaterial: THREE.ShaderMaterial;
    let backgroundPlane: THREE.Mesh;
    let backgroundPlaneGeometry: THREE.PlaneGeometry;
    const clock = new THREE.Clock();

    const vertexShader = `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

    const fragmentShader = `
            uniform vec2 u_resolution;
            uniform float u_time;
            varying vec2 vUv;

            vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
            vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472090914 * r; }
            float snoise(vec3 v) {
                const vec2 C = vec2(1.0/6.0, 1.0/3.0);
                const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
                vec3 i  = floor(v + dot(v, C.yyy));
                vec3 x0 = v - i + dot(i, C.xxx);
                vec3 g = step(x0.yzx, x0.xyz);
                vec3 l = 1.0 - g;
                vec3 i1 = min(g.xyz, l.zxy);
                vec3 i2 = max(g.xyz, l.zxy);
                vec3 x1 = x0 - i1 + C.xxx;
                vec3 x2 = x0 - i2 + C.yyy;
                vec3 x3 = x0 - D.yyy;
                i = mod289(i);
                vec4 p = permute(permute(permute(
                            i.z + vec4(0.0, i1.z, i2.z, 1.0))
                        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
                float n_ = 0.142857142857; // 1.0/7.0
                vec3 ns = n_ * D.wyz - D.xzx;
                vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
                vec4 x_ = floor(j * ns.z);
                vec4 y_ = floor(j - 7.0 * x_);
                vec4 x = x_ * ns.x + ns.yyyy;
                vec4 y = y_ * ns.x + ns.yyyy;
                vec4 h = 1.0 - abs(x) - abs(y);
                vec4 b0 = vec4(x.xy, y.xy);
                vec4 b1 = vec4(x.zw, y.zw);
                vec4 s0 = floor(b0)*2.0 + 1.0;
                vec4 s1 = floor(b1)*2.0 + 1.0;
                vec4 sh = -step(h, vec4(0.0));
                vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
                vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
                vec3 p0 = vec3(a0.xy,h.x);
                vec3 p1 = vec3(a0.zw,h.y);
                vec3 p2 = vec3(a1.xy,h.z);
                vec3 p3 = vec3(a1.zw,h.w);
                vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
                p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
                vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
                m = m * m;
                return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
            }

            float fbm(vec3 p, float H) {
                float G = exp2(-H);
                float f = 1.0;
                float a = 1.0;
                float t_noise = 0.0;
                for(int i = 0; i < 4; i++) {
                    t_noise += a*snoise(f*p);
                    f *= 2.0;
                    a *= G;
                }
                return t_noise;
            }

            void main() {
                vec2 uv = vUv; // Use raw UV coordinates (0 to 1) - this will cause stretching
                float t = u_time * 0.4;

                float fbm_pattern_large = fbm(vec3(uv * 0.8, t * 0.15), 0.7);
                float fbm_pattern_medium = fbm(vec3(uv * 2.0, t * 0.4 + 5.0), 0.6) * 0.5;
                float fbm_pattern_fine = fbm(vec3(uv * 4.0, t * 0.7 + 10.0), 0.5) * 0.25;

                float combined_fbm = (fbm_pattern_large + fbm_pattern_medium + fbm_pattern_fine) / (1.0 + 0.5 + 0.25);
                combined_fbm = (combined_fbm + 1.0) * 0.5;

                vec3 color_warm_center_A = vec3(0.9, 0.5, 0.2);
                vec3 color_warm_center_B = vec3(0.95, 0.65, 0.3);
                vec3 color_edge_blue     = vec3(0.45, 0.6, 0.8);
                vec3 color_soft_highlight = vec3(0.95, 0.85, 0.75);

                vec3 center_colors = mix(color_warm_center_A, color_warm_center_B, smoothstep(0.3, 0.7, combined_fbm + sin(t * 0.3) * 0.05));

                vec2 centered_uv_for_radial = uv - vec2(0.5);
                float dist_from_center = length(centered_uv_for_radial);

                float edge_factor = smoothstep(0.30, 0.55, dist_from_center);
                vec3 final_color = mix(center_colors, color_edge_blue, edge_factor);

                float highlight_noise_val = (snoise(vec3(uv * 3.0, t * 0.9 + 20.0)) + 1.0) * 0.5;
                highlight_noise_val = pow(highlight_noise_val, 5.0);
                final_color = mix(final_color, color_soft_highlight, highlight_noise_val * 0.3);

                final_color *= (0.97 + sin(t * 0.1 + (vUv.y + vUv.x) * 0.5) * 0.03);
                final_color += vec3(0.01);

                gl_FragColor = vec4(final_color, 1.0);
            }
        `;

    const VignetteShader = {
      uniforms: {
        tDiffuse: { value: null },
        offset: { value: 0.95 },
        darkness: { value: 0.5 },
      },
      vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                }`,
      fragmentShader: `
                uniform float offset;
                uniform float darkness;
                uniform sampler2D tDiffuse;
                varying vec2 vUv;
                void main() {
                    vec2 uv = vUv; // Vignette is based on raw UVs, will be elliptical on non-square
                    vec4 texel = texture2D( tDiffuse, uv );
                    vec2 centerDist = uv - vec2(0.5);
                    float len = length(centerDist);
                    // The vignette will naturally become elliptical due to using raw UV length
                    float vignette = smoothstep(offset * 0.2, offset * 0.7, len);
                    gl_FragColor = vec4(texel.rgb * (1.0 - vignette * darkness), texel.a);
                }`,
    };

    function getFrustumSizeAtDistance(
      camera: THREE.PerspectiveCamera,
      distance: number,
    ) {
      const vFOV = THREE.MathUtils.degToRad(camera.fov);
      const height = 2 * Math.tan(vFOV / 2) * distance;
      const width = height * camera.aspect;
      return { width, height };
    }

    function updateBackgroundPlaneScale() {
      if (!camera || !backgroundPlane) return;
      const distance = Math.abs(camera.position.z - backgroundPlane.position.z);
      const frustumSize = getFrustumSizeAtDistance(camera, distance);
      backgroundPlane.scale.set(
        frustumSize.width / 2,
        frustumSize.height / 2,
        1,
      );
    }

    function init() {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        100,
      );
      camera.position.z = 1;

      renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current!,
        antialias: false,
        powerPreference: "low-power",
      });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      backgroundPlaneGeometry = new THREE.PlaneGeometry(2, 2);
      backgroundMaterial = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        uniforms: {
          u_time: { value: 0.0 },
          u_resolution: {
            value: new THREE.Vector2(window.innerWidth, window.innerHeight),
          },
        },
        depthWrite: false,
        depthTest: false,
      });
      backgroundPlane = new THREE.Mesh(
        backgroundPlaneGeometry,
        backgroundMaterial,
      ); // Assign to the outer scope variable
      scene.add(backgroundPlane);

      updateBackgroundPlaneScale();

      composer = new EffectComposer(renderer);
      const renderPass = new RenderPass(scene, camera);
      composer.addPass(renderPass);

      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.3,
        0.5,
        0.8,
      );
      composer.addPass(bloomPass);

      const vignettePass = new ShaderPass(VignetteShader);
      composer.addPass(vignettePass);

      window.addEventListener("resize", onWindowResize, false);
      animate();
    }

    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();

      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      composer.setSize(window.innerWidth, window.innerHeight);

      if (backgroundMaterial) {
        backgroundMaterial.uniforms.u_resolution?.value.set(
          window.innerWidth,
          window.innerHeight,
        );
      }
      updateBackgroundPlaneScale();
    }

    function animate() {
      animationFrameIdRef.current = requestAnimationFrame(animate);
      if (backgroundMaterial?.uniforms.u_time) {
        const elapsedTime = clock.getElapsedTime();
        backgroundMaterial.uniforms.u_time.value = elapsedTime;
      }
      if (composer) {
        composer.render();
      }
    }

    init();

    return () => {
      window.removeEventListener("resize", onWindowResize);
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }

      if (renderer) renderer.dispose();
      if (backgroundMaterial) backgroundMaterial.dispose();
      if (backgroundPlaneGeometry) backgroundPlaneGeometry.dispose();

      composer?.passes.forEach((pass) => {
        if (typeof (pass as any).dispose === "function") {
          (pass as any).dispose();
        }
      });

      if (scene) {
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
              if (Array.isArray(object.material)) {
                object.material.forEach((material) => material.dispose());
              } else {
                (object.material as THREE.Material).dispose();
              }
            }
          }
        });
        scene.clear();
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 -z-10 h-full w-full">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
};

export default Background;
