import Head from "next/head";
import Yolo from "../components/models/Yolo";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Image from 'next/image'; // Import the Image component from Next.js
import icon from 'public/icon.png'; // Import your icon (adjust the path as needed)

export default function Home() {
  return (
    <>
      <main className="font-mono flex flex-col justify-center items-center w-screen">
        <div className="flex items-center justify-center">
          {/* Wrap the Image component in an anchor tag */}
          <a href="https://masyen.com.tr/" target="_blank" rel="noopener noreferrer">
            <Image src={icon} alt="Masyen Logo" width={50} height={50} />
          </a>

          <h1 className="m-5 text-xl font-bold">Masyen Object Detecction</h1>
        </div>
        <Yolo />
      </main>
    </>
  );
}
