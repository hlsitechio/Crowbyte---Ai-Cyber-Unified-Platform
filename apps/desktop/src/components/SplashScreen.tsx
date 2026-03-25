import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
 onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
 const [videoEnded, setVideoEnded] = useState(false);

 useEffect(() => {
 // Mark splash screen as shown
 const timeout = setTimeout(() => {
 localStorage.setItem('crowbyte-splash-shown', 'true');
 }, 500);

 return () => clearTimeout(timeout);
 }, []);

 const handleVideoEnd = () => {
 setVideoEnded(true);
 setTimeout(() => {
 onComplete();
 }, 500);
 };

 const handleSkip = () => {
 setVideoEnded(true);
 setTimeout(() => {
 onComplete();
 }, 300);
 };

 return (
 <AnimatePresence>
 {!videoEnded && (
 <motion.div
 className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.5 }}
 >
 {/* Video Container */}
 <div className="relative w-full h-full flex items-center justify-center">
 <video
 className="w-full h-full object-contain"
 autoPlay
 onEnded={handleVideoEnd}
 style={{ maxWidth: '100vw', maxHeight: '100vh' }}
 >
 <source src="Ghostly_Terminal_Video_Generation.mp4" type="video/mp4" />
 Your browser does not support the video tag.
 </video>

 {/* Skip Button */}
 <motion.button
 className="absolute bottom-8 right-8 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white font-medium transition-all duration-300 border border-white/20 hover:border-white/40"
 onClick={handleSkip}
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 1 }}
 whileHover={{ scale: 1.05 }}
 whileTap={{ scale: 0.95 }}
 >
 Skip Intro
 </motion.button>

 {/* Subtle Gradient Overlay */}
 <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 );
}
