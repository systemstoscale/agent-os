"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

type GreetingProps = {
  userName?: string;
  centered?: boolean;
};

const getTimeBasedGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 18) {
    return "Good afternoon";
  }
  return "Good evening";
};

export const Greeting = ({ userName, centered = false }: GreetingProps) => {
  const greeting = useMemo(() => {
    const timeGreeting = getTimeBasedGreeting();
    return userName ? `${timeGreeting}, ${userName}` : timeGreeting;
  }, [userName]);

  if (centered) {
    return (
      <div className="flex flex-col items-center text-center" key="overview">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="font-semibold text-2xl md:text-4xl"
          exit={{ opacity: 0, y: 10 }}
          initial={{ opacity: 0, y: 10 }}
          transition={{ delay: 0.2 }}
        >
          {greeting}
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="mx-auto mt-4 flex size-full max-w-3xl flex-col justify-center px-4 md:mt-16 md:px-8"
      key="overview"
    >
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="font-semibold text-xl md:text-2xl"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.5 }}
      >
        {greeting}
      </motion.div>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="text-xl text-zinc-500 md:text-2xl"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.6 }}
      >
        How can I help you today?
      </motion.div>
    </div>
  );
};
