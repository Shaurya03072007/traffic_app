import React, { useState } from 'react';
import { DEMO_SCENARIOS } from '../services/api';
import { DemoVideoScenario } from '../types';
import { Play, Pause, RefreshCw, Cpu, CheckCircle, AlertTriangle, Shield, Check, Info } from 'lucide-react';

export const DemoVideoLab: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<DemoVideoScenario>(DEMO_SCENARIOS[0]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(100);
  const [analysisResults, setAnalysisResults] = useState({
    helmetViolation: false,
    helmetConf: 0.94,
    tripleRiding: false,
    tripleConf: 0.91,
    plateNumber: 'KA05EQ7714',
    ridersDetected: 1,
    fps: 24.8,
    inferenceMs: 27
  });

  const handleRunInference = (scenario: DemoVideoScenario) => {
    setSelectedScenario(scenario);
    setIsAnalyzing(true);
    setAnalysisProgress(0);

    const interval = setInterval(() => {
      setAnalysisProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsAnalyzing(false);
          setAnalysisResults({
            helmetViolation: scenario.groundTruth.helmetViolation,
            helmetConf: scenario.groundTruth.helmetViolation ? 0.94 : 0.92,
            tripleRiding: scenario.groundTruth.tripleRiding,
            tripleConf: scenario.groundTruth.tripleRiding ? 0.91 : 0.89,
            plateNumber: scenario.groundTruth.recommendedPlate,
            ridersDetected: scenario.groundTruth.riderCount,
            fps: 24.8,
            inferenceMs: 27
          });
          return 100;
        }
        return prev + 25;
      });
    }, 250);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-white">AI Computer Vision Video Testing Laboratory</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                COLLEGE DEMO BENCHMARK
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Evaluates the open-source YOLO and heuristic multi-rider association pipeline across 4 standard test cases.
            </p>
          </div>
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
            <Cpu className="w-4 h-4 text-sky-400" />
            <span>Architecture: 4 FPS Frame Sampling • Centroid Associator</span>
          </div>
        </div>
      </div>

      {/* 4 Demo Scenario Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {DEMO_SCENARIOS.map((scenario) => {
          const isSelected = selectedScenario.id === scenario.id;
          return (
            <div
              key={scenario.id}
              onClick={() => handleRunInference(scenario)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-slate-800 border-amber-500 shadow-lg shadow-amber-500/10'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="relative aspect-video rounded-lg overflow-hidden mb-3 bg-black">
                <img src={scenario.thumbnailUrl} alt={scenario.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow">
                    <Play className="w-4 h-4 fill-slate-950 ml-0.5" />
                  </div>
                </div>
              </div>
              <h3 className="font-bold text-xs text-white line-clamp-1">{scenario.title}</h3>
              <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">{scenario.description}</p>
              <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                {scenario.groundTruth.helmetViolation ? (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-medium">No Helmet</span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium">Helmet OK</span>
                )}
                {scenario.groundTruth.tripleRiding ? (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 font-medium">Triple Riding</span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-medium">1 Rider</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Real-time Video Viewport & Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Player with Simulated Scanline / Bounding Boxes */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              Live Inference Stream: {selectedScenario.title}
            </span>
            <button
              onClick={() => handleRunInference(selectedScenario)}
              disabled={isAnalyzing}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs flex items-center space-x-1.5 transition-all"
            >
              <RefreshCw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin text-amber-400' : ''}`} />
              <span>{isAnalyzing ? 'Processing Video...' : 'Rerun Detection'}</span>
            </button>
          </div>

          <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
            <video
              key={selectedScenario.videoUrl}
              src={selectedScenario.videoUrl}
              controls
              autoPlay
              loop
              className="w-full h-full object-contain"
            />

            {/* Overlaid Animated Detection Bounding Boxes */}
            {!isAnalyzing && (
              <div className="absolute inset-0 pointer-events-none p-6">
                {/* Motorcycle Box */}
                <div className="absolute top-[35%] left-[30%] w-[38%] h-[50%] border-2 border-amber-400 rounded-sm">
                  <span className="bg-amber-500 text-slate-950 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-sm">
                    Motorcycle (0.97)
                  </span>
                </div>

                {/* Helmet Detection Box */}
                {analysisResults.helmetViolation ? (
                  <div className="absolute top-[22%] left-[42%] w-[14%] h-[16%] border-2 border-red-500 rounded-sm">
                    <span className="bg-red-600 text-white text-[9px] font-mono font-bold px-1 py-0.5 rounded-sm">
                      ALERT: NO HELMET ({(analysisResults.helmetConf * 100).toFixed(0)}%)
                    </span>
                  </div>
                ) : (
                  <div className="absolute top-[22%] left-[42%] w-[14%] h-[16%] border-2 border-emerald-400 rounded-sm">
                    <span className="bg-emerald-600 text-white text-[9px] font-mono font-bold px-1 py-0.5 rounded-sm">
                      HELMET DETECTED ({(analysisResults.helmetConf * 100).toFixed(0)}%)
                    </span>
                  </div>
                )}

                {/* Triple Riding Box */}
                {analysisResults.tripleRiding && (
                  <div className="absolute top-[20%] left-[28%] w-[42%] h-[65%] border-2 border-orange-500 rounded-sm">
                    <span className="bg-orange-600 text-white text-[9px] font-mono font-bold px-1 py-0.5 rounded-sm">
                      ALERT: 3 RIDERS ON VEHICLE ({(analysisResults.tripleConf * 100).toFixed(0)}%)
                    </span>
                  </div>
                )}

                <div className="absolute bottom-3 left-3 bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-md border border-slate-800 text-[11px] font-mono text-slate-300">
                  INFERENCE: {analysisResults.inferenceMs}ms • FPS: {analysisResults.fps} • PLATE: {analysisResults.plateNumber}
                </div>
              </div>
            )}

            {isAnalyzing && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
                <div className="w-12 h-12 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
                <div className="text-white text-sm font-bold">Executing Computer Vision Pipeline...</div>
                <div className="text-xs text-slate-400 mt-1">Sampling 4 FPS • Rider-Motorcycle Centroid Tracker</div>
                <div className="w-48 bg-slate-800 h-2 rounded-full mt-4 overflow-hidden">
                  <div className="bg-amber-500 h-full transition-all duration-300" style={{ width: `${analysisProgress}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Real-time Detection Telemetry Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">AI Inference Telemetry</h3>
            <p className="text-xs text-slate-400">Model: YOLOv8-TrafficCustom-v1.2</p>
          </div>

          <div className="space-y-3">
            {/* Helmet Score */}
            <div className={`p-3 rounded-xl border ${analysisResults.helmetViolation ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">Helmet Safety Compliance</span>
                <span className="font-mono font-bold">{analysisResults.helmetViolation ? 'VIOLATION' : 'COMPLIANT'}</span>
              </div>
              <div className="mt-2 text-xs font-mono text-slate-400">
                Confidence: <span className="text-white font-bold">{(analysisResults.helmetConf * 100).toFixed(1)}%</span>
              </div>
            </div>

            {/* Capacity Score */}
            <div className={`p-3 rounded-xl border ${analysisResults.tripleRiding ? 'bg-orange-500/10 border-orange-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">Rider Capacity Analysis</span>
                <span className="font-mono font-bold">{analysisResults.tripleRiding ? 'TRIPLE RIDING' : 'PERMISSIBLE'}</span>
              </div>
              <div className="mt-2 text-xs font-mono text-slate-400">
                Associated Riders: <span className="text-white font-bold">{analysisResults.ridersDetected}</span> • Confidence: <span className="text-white font-bold">{(analysisResults.tripleConf * 100).toFixed(1)}%</span>
              </div>
            </div>

            {/* License Plate OCR */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-xs text-slate-400">Predicted License Plate (OCR):</div>
              <div className="text-lg font-mono font-bold text-amber-400 mt-1">{analysisResults.plateNumber}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Subject to officer manual edit & confirmation</div>
            </div>
          </div>

          {/* College Project Disclaimer */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="font-bold text-slate-300 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-amber-400" />
              <span>Officer Decision-Support Policy</span>
            </div>
            <p>
              AI detections are probabilistic. Under constitutional jurisprudence, no fine is automatically issued without human officer confirmation on the review screen.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
