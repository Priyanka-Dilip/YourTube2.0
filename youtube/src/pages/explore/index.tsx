import CategoryTabs from "@/components/category-tabs";
import Videogrid from "@/components/Videogrid";
import React from "react";

const Explore = () => {
  return (
    <main className="flex-1 min-h-screen bg-background text-foreground p-4">
      <h1 className="text-2xl font-semibold mb-4">Explore</h1>

      <CategoryTabs />

      <div className="mt-6">
        <Videogrid />
      </div>
    </main>
  );
};

export default Explore;