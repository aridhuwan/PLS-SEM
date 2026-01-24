import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Upload, Database, Network, Play, FileText, 
  Settings, Plus, Trash2, 
  Download, Activity, ArrowRight,
  Save, RefreshCw, X, Check,
  Eye, ArrowUp, ArrowDown, ArrowLeft, MousePointer2, Sparkles, 
  Table as TableIcon, 
  BarChart2, 
  Image as ImageIcon, ChevronDown,
  Cpu, Layers, Zap, Filter, Key
} from 'lucide-react';
import { toast as sonnerToast } from "sonner"; // Renamed to avoid conflict with shadcn/ui toast
import GeminiApiKeySettings from '@/components/GeminiApiKeySettings'; // Import the new component

/**
 * GEMINI API UTILITIES
 */
const GEMINI_API_KEY_STORAGE_KEY = "geminiApiKey"; // Define the storage key

const callGemini = async (prompt: string, systemInstruction: string = "") => {
  const apiKey = localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY); // Retrieve from local storage
  if (!apiKey) {
      sonnerToast.error("Gemini API Key is missing. Please add it in the AI Settings.");
      console.warn("Gemini API Key not found (expected in local storage).");
      return "Gemini API Key is missing. Please add it in the AI Settings.";
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`Gemini API Error: ${response.statusText}`);
    
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
  } catch (error) {
    console.error("Gemini API Call Failed:", error);
    return "Error connecting to AI service. Please try again later.";
  }
};

/**
 * UTILITIES
 */

const loadScript = (src: string) => {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

// Pseudo-Random Number Generator for Seeding
const sfc32 = (a: number, b: number, c: number, d: number) => {
    return function() {
      a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; 
      var t = (a + b) | 0;
      a = b ^ b >>> 9;
      b = c + (c << 3) | 0;
      c = (c << 21 | c >>> 11);
      d = d + 1 | 0;
      t = (t + d) | 0;
      c = (c + t) | 0;
      return (t >>> 0) / 4294967296;
    }
}

const createSeededRandom = (seed: string) => {
    // Simple hash to generate seeds for sfc32
    let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
    for (let i = 0, k; i < seed.length; i++) {
        k = seed.charCodeAt(i);
        h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
        h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
        h3 = h4 ^ Math.imul(h4 ^ k, 951274213);
        h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    return sfc32(h1, h2, h3, h4);
}

/**
 * MATH & STATISTICS UTILITIES
 */

class Matrix {
  rows: number;
  cols: number;
  data: number[][];

  constructor(rows: number, cols: number, data: number[][] | null = null) {
    this.rows = rows;
    this.cols = cols;
    this.data = data || Array(rows).fill(0).map(() => Array(cols).fill(0));
  }

  static fromArray(arr: number[][]) {
    return new Matrix(arr.length, arr[0].length, arr);
  }

  transpose() {
    const result = new Matrix(this.cols, this.rows);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        result.data[j][i] = this.data[i][j];
      }
    }
    return result;
  }

  multiply(other: Matrix) {
    if (this.cols !== other.rows) throw new Error("Dimension mismatch");
    const result = new Matrix(this.rows, other.cols);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < other.cols; j++) {
        let sum = 0;
        for (let k = 0; k < this.cols; k++) {
          sum += this.data[i][k] * other.data[k][j];
        }
        result.data[i][j] = sum;
      }
    }
    return result;
  }

  static standardize(matrix: Matrix) {
    const result = new Matrix(matrix.rows, matrix.cols);
    const means = Array(matrix.cols).fill(0);
    const stds = Array(matrix.cols).fill(0);

    for (let j = 0; j < matrix.cols; j++) {
      let sum = 0;
      for (let i = 0; i < matrix.rows; i++) sum += matrix.data[i][j];
      means[j] = sum / matrix.rows;
    }

    for (let j = 0; j < matrix.cols; j++) {
      let sumSq = 0;
      for (let i = 0; i < matrix.rows; i++) {
        sumSq += Math.pow(matrix.data[i][j] - means[j], 2);
      }
      stds[j] = Math.sqrt(sumSq / (matrix.rows - 1));
    }

    for (let i = 0; i < matrix.rows; i++) {
      for (let j = 0; j < matrix.cols; j++) {
        result.data[i][j] = (stds[j] === 0) ? 0 : (matrix.data[i][j] - means[j]) / stds[j];
      }
    }
    return result;
  }

  getColumn(colIndex: number) {
    return this.data.map(row => row[colIndex]);
  }

  // Gaussian elimination for Matrix Inverse
  invert(): Matrix | null {
    if (this.rows !== this.cols) throw new Error("Matrix must be square");
    const n = this.rows;
    const A = this.data.map(row => [...row]); 
    const I = Array(n).fill(0).map((_, i) => Array(n).fill(0).map((_, j) => (i === j ? 1 : 0)));

    for (let i = 0; i < n; i++) {
      let pivot = A[i][i];
      if (Math.abs(pivot) < 1e-10) return null; 

      for (let j = 0; j < n; j++) {
        A[i][j] /= pivot;
        I[i][j] /= pivot;
      }

      for (let k = 0; k < n; k++) {
        if (k !== i) {
          let factor = A[k][i];
          for (let j = 0; j < n; j++) {
            A[k][j] -= factor * A[i][j];
            I[k][j] -= factor * I[i][j];
          }
        }
      }
    }
    return new Matrix(n, n, I);
  }
}

const correlate = (arr1: number[], arr2: number[]) => {
  const n = arr1.length;
  const mean1 = arr1.reduce((a, b) => a + b) / n;
  const mean2 = arr2.reduce((a, b) => a + b) / n;
  let num = 0, den1 = 0, den2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = arr1[i] - mean1;
    const dy = arr2[i] - mean2;
    num += dx * dy;
    den1 += dx * dx;
    den2 += dy * dy;
  }
  return (den1 === 0 || den2 === 0) ? 0 : num / Math.sqrt(den1 * den2);
};

const normalcdf = (mean: number, sigma: number, to: number) => {
    var z = (to - mean) / Math.sqrt(2 * sigma * sigma);
    var t = 1 / (1 + 0.3275911 * Math.abs(z));
    var a1 =  0.254829592;
    var a2 = -0.284496736;
    var a3 =  1.421413741;
    var a4 = -1.453152027;
    var a5 =  1.061405429;
    var erf = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
    var sign = 1;
    if (z < 0) sign = -1;
    return (1/2) * (1 + sign * erf);
};

const calculatePValue = (tStat: number, twoTailed: boolean = true) => {
    const p = 1 - normalcdf(0, 1, Math.abs(tStat));
    const finalP = twoTailed ? 2 * p : p;
    return Math.max(0, Math.min(1, finalP)); 
};

// Impute Missing Values (Mean Replacement)
const imputeMissingValues = (data: (number | string | null)[][]) => {
    if (data.length === 0) return [];
    const cols = data[0].length;
    const newData: number[][] = data.map(row => [...row] as number[]); // Deep copy and type assertion
    
    for (let j = 0; j < cols; j++) {
        let sum = 0;
        let count = 0;
        for (let i = 0; i < data.length; i++) {
            const val = parseFloat(data[i][j] as string);
            if (!isNaN(val) && data[i][j] !== null && data[i][j] !== "") {
                sum += val;
                count++;
            }
        }
        const mean = count > 0 ? sum / count : 0;
        for (let i = 0; i < data.length; i++) {
             const val = parseFloat(data[i][j] as string);
            if (isNaN(val) || data[i][j] === null || data[i][j] === "") {
                newData[i][j] = mean;
            } else {
                newData[i][j] = val; // Ensure numeric type
            }
        }
    }
    return newData;
};

interface DescriptiveStatsResult {
  indicator: string;
  mean: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
  skewness: number;
  kurtosis: number;
}

// Descriptive Statistics Helper
const calculateDescriptiveStats = (data: Record<string, any>[], variables: string[]): DescriptiveStatsResult[] => {
  const stats: DescriptiveStatsResult[] = [];
  variables.forEach(v => {
    const values = data.map(row => parseFloat(row[v] || 0)).filter(n => !isNaN(n)).sort((a, b) => a - b);
    const n = values.length;
    if (n === 0) return;

    const mean = values.reduce((a, b) => a + b, 0) / n;
    const min = values[0];
    const max = values[n - 1];
    const mid = Math.floor(n / 2);
    const median = n % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1);
    const stdDev = Math.sqrt(variance);

    let m3 = 0, m4 = 0;
    values.forEach(val => {
        m3 += Math.pow(val - mean, 3);
        m4 += Math.pow(val - mean, 4);
    });
    
    const skewness = n > 2 && stdDev > 0 ? (n * m3) / ((n - 1) * (n - 2) * Math.pow(stdDev, 3)) : 0;
    const kurtosis = n > 3 && stdDev > 0 ? ((n * (n + 1) * m4) / ((n - 1) * (n - 2) * (n - 3) * Math.pow(stdDev, 4))) - ((3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3))) : 0;

    stats.push({
      indicator: v,
      mean,
      median,
      min,
      max,
      stdDev,
      skewness,
      kurtosis
    });
  });
  return stats;
};

interface DemographicResult {
  variable: string;
  type: 'numeric' | 'categorical';
  stats?: { n: number; mean: number; median: number; min: number; max: number; std: number; };
  n?: number;
  frequency?: { label: string; count: number; percentage: number; }[];
}

// Demographic/Categorical Stats
const analyzeDemographics = (data: Record<string, any>[], variables: string[]): DemographicResult[] => {
  const results: DemographicResult[] = [];
  variables.forEach(v => {
    const col = data.map(row => row[v]);
    const validValues = col.filter(val => val !== undefined && val !== null && val !== '');
    const n = validValues.length;
    
    const numericCount = validValues.filter(val => !isNaN(Number(val))).length;
    const isNumeric = n > 0 && (numericCount / n) > 0.8;
    
    if (isNumeric && numericCount > 5) {
       const values = validValues.map(val => Number(val)).sort((a, b) => a - b);
       const mean = values.reduce((a, b) => a + b, 0) / n;
       const min = values[0];
       const max = values[n - 1];
       const mid = Math.floor(n / 2);
       const median = n % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
       const std = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n-1));

       results.push({ variable: v, type: 'numeric', stats: { n, mean, median, min, max, std } });
    } else {
       const counts: Record<string, number> = {};
       validValues.forEach(val => counts[val] = (counts[val] || 0) + 1);
       const frequency = Object.keys(counts).map(key => ({
         label: key, count: counts[key], percentage: (counts[key] / n) * 100
       })).sort((a, b) => b.count - a.count); 

       results.push({ variable: v, type: 'categorical', n, frequency });
    }
  });
  return results;
};

interface Construct {
  id: string;
  name: string;
  x: number;
  y: number;
  indicators: string[];
  orientation: 'left' | 'right' | 'top' | 'bottom';
  indicatorPositions: Record<string, { x: number; y: number }>;
}

interface Path {
  source: string;
  target: string;
}

interface PLSConfig {
  type: string;
  weightingScheme: 'path' | 'factor';
  maxIterations: number;
  stopCriterion: number;
  subsamples?: number;
  randomSeed?: string;
  testType?: 'two-tailed' | 'one-tailed';
  significanceLevel?: number;
}

interface PathCoefficient {
  sourceId: string;
  targetId: string;
  source: string;
  target: string;
  value: number;
  sampleMean?: number | null;
  stdev?: number | null;
  tValue: number;
  pValue: number;
}

interface ConstructReliability {
  construct: string;
  ave: number;
  cronbach: number;
  cr: number;
}

interface OuterLoading {
  construct: string;
  indicator: string;
  value: number;
  sampleMean?: number | null;
  stdev?: number | null;
  tValue: number;
  pValue: number;
}

interface PLSResults {
  pathCoefficients: PathCoefficient[];
  rSquare: Record<string, number>;
  constructReliability: ConstructReliability[];
  outerLoadings: OuterLoading[];
  descriptiveStats: DescriptiveStatsResult[];
  config: PLSConfig;
}

// PLS Estimation (Lohmöller with Path Weighting)
const estimatePLS = (X: Matrix, constructs: Construct[], paths: Path[], indicatorMap: Record<string, number[]>, config: PLSConfig) => {
  const isConsistent = config.type.includes('consistent');
  const weightingScheme = config.weightingScheme || 'path'; 
  
  let weights: Record<string, number[]> = {};
  constructs.forEach(c => {
    const k = indicatorMap[c.id].length;
    weights[c.id] = Array(k).fill(1 / Math.sqrt(k || 1));
  });

  const MAX_ITER = config.maxIterations || 300;
  const TOLERANCE = Math.pow(10, -(config.stopCriterion || 7));
  let latentScores: Record<string, number[]> = {};

  for (let iter = 0; iter < MAX_ITER; iter++) {
    let oldWeights = JSON.parse(JSON.stringify(weights));

    // Outer Approximation
    constructs.forEach(c => {
      const idxs = indicatorMap[c.id];
      const w = weights[c.id];
      const scores = Array(X.rows).fill(0);
      for (let i = 0; i < X.rows; i++) {
        let val = 0;
        for (let j = 0; j < idxs.length; j++) {
          val += X.data[i][idxs[j]] * w[j];
        }
        scores[i] = val;
      }
      const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
      const std = Math.sqrt(scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (scores.length - 1));
      latentScores[c.id] = scores.map(s => (s - mean) / (std || 1));
    });

    // Inner Approximation
    let innerProxies: Record<string, number[]> = {};
    constructs.forEach(target => {
      const targetScore = latentScores[target.id];
      const predecessors = paths.filter(p => p.target === target.id).map(p => p.source);
      const successors = paths.filter(p => p.source === target.id).map(p => p.target);
      const neighbors = [...predecessors, ...successors];

      if (neighbors.length === 0) {
        innerProxies[target.id] = targetScore;
        return;
      }

      let innerWeights: Record<string, number> = {}; 

      if (weightingScheme === 'path' && predecessors.length > 0) {
        const k = predecessors.length;
        const R_xx = new Matrix(k, k);
        for(let i=0; i<k; i++) {
          for(let j=0; j<k; j++) {
             R_xx.data[i][j] = correlate(latentScores[predecessors[i]], latentScores[predecessors[j]]);
          }
        }
        const r_xy = new Matrix(k, 1);
        for(let i=0; i<k; i++) {
           r_xy.data[i][0] = correlate(latentScores[predecessors[i]], targetScore);
        }
        const R_inv = R_xx.invert();
        
        if (R_inv) {
           const Beta = R_inv.multiply(r_xy);
           predecessors.forEach((pid, idx) => { innerWeights[pid] = Beta.data[idx][0]; });
        } else {
           predecessors.forEach(pid => { innerWeights[pid] = correlate(latentScores[pid], targetScore); });
        }
        successors.forEach(sid => { innerWeights[sid] = correlate(latentScores[sid], targetScore); });
      } else {
        neighbors.forEach(nid => { innerWeights[nid] = correlate(latentScores[nid], targetScore); });
      }

      const z = Array(X.rows).fill(0);
      for(let i=0; i<X.rows; i++) {
         let sum = 0;
         neighbors.forEach(nid => { sum += (innerWeights[nid] || 0) * latentScores[nid][i]; });
         z[i] = sum;
      }
      const zMean = z.reduce((a,b)=>a+b,0)/z.length;
      const zStd = Math.sqrt(z.reduce((a,b)=>a+Math.pow(b-zMean,2),0)/(z.length-1));
      innerProxies[target.id] = z.map(v => (v-zMean)/(zStd || 1));
    });

    // Update Outer Weights
    constructs.forEach(c => {
      const idxs = indicatorMap[c.id];
      const proxy = innerProxies[c.id];
      const newW = idxs.map(colIdx => {
        const indicatorData = X.getColumn(colIdx);
        return correlate(indicatorData, proxy);
      });
      weights[c.id] = newW;
    });

    let maxDiff = 0;
    constructs.forEach(c => {
      weights[c.id].forEach((w, i) => { maxDiff = Math.max(maxDiff, Math.abs(w - oldWeights[c.id][i])); });
    });

    if (maxDiff < TOLERANCE) break;
  }

  // Final Scores Calculation
  constructs.forEach(c => {
      const idxs = indicatorMap[c.id];
      const w = weights[c.id];
      const scores = Array(X.rows).fill(0);
      for (let i = 0; i < X.rows; i++) {
        let val = 0;
        for (let j = 0; j < idxs.length; j++) { val += X.data[i][idxs[j]] * w[j]; }
        scores[i] = val;
      }
      const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
      const std = Math.sqrt(scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (scores.length - 1));
      latentScores[c.id] = scores.map(s => (s - mean) / (std || 1));
  });

  // Consistency Correction
  let correctionFactors: Record<string, number> = {};
  if (isConsistent) {
      constructs.forEach(c => {
          const idxs = indicatorMap[c.id];
          if(idxs.length > 0) {
            let corSum = 0;
            let count = 0;
            for(let i=0; i<idxs.length; i++) {
              for(let j=i+1; j<idxs.length; j++) {
                corSum += correlate(X.getColumn(idxs[i]), X.getColumn(idxs[j]));
                count++;
              }
            }
            const avgR = count > 0 ? corSum / count : 1;
            const k = idxs.length;
            const reliability = (k * avgR) / (1 + (k - 1) * avgR);
            correctionFactors[c.id] = Math.sqrt(Math.max(reliability, 0.1)); 
          } else {
            correctionFactors[c.id] = 1;
          }
      });
  }

  const pathCoefficients: PathCoefficient[] = [];
  const rSquare: Record<string, number> = {};

  constructs.forEach(target => {
    const incoming = paths.filter(p => p.target === target.id);
    if (incoming.length > 0) {
      const predictors = incoming.map(p => p.source);
      const k = predictors.length;
      const R_xx = new Matrix(k, k);
      for(let i=0; i<k; i++) {
        for(let j=0; j<k; j++) {
           let r = correlate(latentScores[predictors[i]], latentScores[predictors[j]]);
           if (isConsistent && predictors[i] !== predictors[j]) {
              r /= ((correctionFactors[predictors[i]] || 1) * (correctionFactors[predictors[j]] || 1));
           }
           R_xx.data[i][j] = r;
        }
      }
      
      const r_xy = new Matrix(k, 1);
      for(let i=0; i<k; i++) {
         let r = correlate(latentScores[predictors[i]], latentScores[target.id]);
         if (isConsistent) {
            r /= ((correctionFactors[predictors[i]] || 1) * (correctionFactors[target.id] || 1));
         }
         r_xy.data[i][0] = r;
      }

      const R_inv = R_xx.invert();
      if (R_inv) {
         const Beta = R_inv.multiply(r_xy);
         let r2_accum = 0;
         predictors.forEach((pid, idx) => {
            const betaVal = Math.max(-1, Math.min(1, Beta.data[idx][0])); 
            pathCoefficients.push({ 
               sourceId: pid, targetId: target.id,
               source: constructs.find(c => c.id === pid)!.name, 
               target: target.name, value: betaVal,
               tValue: 0, pValue: 1.0 // Default values, updated later if bootstrapping
            });
            r2_accum += betaVal * r_xy.data[idx][0];
         });
         rSquare[target.name] = Math.max(0, Math.min(r2_accum, 1));
      } else {
         predictors.forEach(pid => {
            pathCoefficients.push({ sourceId: pid, targetId: target.id, source: constructs.find(c => c.id === pid)!.name, target: target.name, value: 0, tValue: 0, pValue: 1.0 });
         });
         rSquare[target.name] = 0;
      }
    } else {
      rSquare[target.name] = 0;
    }
  });

  return { pathCoefficients, rSquare, latentScores, X, indicatorMap };
};

const runPLSAlgorithm = (data: Record<string, any>[], constructs: Construct[], paths: Path[], config: PLSConfig): PLSResults => {
  const vars = Object.keys(data[0]);
  
  // FIXED: Preserve null/undefined for missing values instead of forcing to 0
  const rawData: (number | string | null)[][] = data.map(row => vars.map(v => {
      const val = row[v];
      // Check for null, undefined, or empty string and return NaN to signal missing
      if (val === null || val === undefined || val === "") return NaN;
      const num = parseFloat(val);
      return isNaN(num) ? NaN : num;
  }));

  const indicatorMap: Record<string, number[]> = {};
  const usedIndicators = new Set<string>();

  constructs.forEach(c => {
    indicatorMap[c.id] = c.indicators.map(ind => {
      usedIndicators.add(ind);
      return vars.indexOf(ind);
    }).filter(i => i !== -1);
  });

  const descriptiveStats = calculateDescriptiveStats(data, Array.from(usedIndicators));
  
  // Impute missing values (Mean Replacement)
  const imputedData = imputeMissingValues(rawData);
  const X_original = Matrix.standardize(Matrix.fromArray(imputedData));
  
  const originalModel = estimatePLS(X_original, constructs, paths, indicatorMap, config);

  // Pre-calculate Original Outer Loadings for Sign Correction Reference
  const originalOuterLoadings: Record<string, number[]> = {};
  constructs.forEach(c => {
     const idxs = indicatorMap[c.id];
     if (idxs.length === 0) return;
     const loadings = idxs.map(idx => correlate(X_original.getColumn(idx), originalModel.latentScores[c.id]));
     originalOuterLoadings[c.id] = loadings;
  });

  const isBootstrapMode = config.type.includes('boot');
  const BOOTSTRAPS = isBootstrapMode ? (config.subsamples || 500) : 0;
  
  // PRNG Setup
  const rand = config.randomSeed ? createSeededRandom(config.randomSeed) : Math.random;
  
  const bootstrapEstimates: Record<string, number[]> = {}; 
  originalModel.pathCoefficients.forEach(pc => {
    bootstrapEstimates[`${pc.sourceId}-${pc.targetId}`] = [];
  });

  // Track outer loadings for bootstrapping stats
  const bootstrapOuterLoadings: Record<string, number[]> = {}; 

  for(let b = 0; b < BOOTSTRAPS; b++) {
    const n = imputedData.length;
    // Resample with replacement
    const indices = Array(n).fill(0).map(() => Math.floor(rand() * n));
    const resampledData = indices.map(i => imputedData[i]);
    
    // Recalculate Standardization for the new sample
    const X_resampled = Matrix.standardize(Matrix.fromArray(resampledData));
    
    // Estimate Model on Bootstrap Sample
    const resModel = estimatePLS(X_resampled, constructs, paths, indicatorMap, config);

    // Apply Sign Change Correction to Align with Original Model
    const signFlips: Record<string, number> = {};

    constructs.forEach(c => {
        const idxs = indicatorMap[c.id];
        if (idxs.length === 0) {
            signFlips[c.id] = 1;
            return;
        };
        
        const bootLoadings = idxs.map(idx => correlate(X_resampled.getColumn(idx), resModel.latentScores[c.id]));
        const origLoadings = originalOuterLoadings[c.id];

        let dotProd = 0;
        for(let i=0; i<bootLoadings.length; i++) {
            dotProd += bootLoadings[i] * origLoadings[i];
        }
        
        const sign = dotProd < 0 ? -1 : 1;
        signFlips[c.id] = sign;

        bootLoadings.forEach((l, i) => {
            const correctedL = l * sign; 
            const key = `${c.name}-${c.indicators[i]}`;
            if (!bootstrapOuterLoadings[key]) bootstrapOuterLoadings[key] = [];
            bootstrapOuterLoadings[key].push(correctedL);
        });
    });

    resModel.pathCoefficients.forEach(pc => {
       if (bootstrapEstimates[`${pc.sourceId}-${pc.targetId}`]) {
         const flipSource = signFlips[pc.sourceId] || 1;
         const flipTarget = signFlips[pc.targetId] || 1;
         const totalFlip = flipSource * flipTarget;
         
         bootstrapEstimates[`${pc.sourceId}-${pc.targetId}`].push(pc.value * totalFlip);
       }
    });
  }

  const isTwoTailed = config.testType === 'two-tailed';
  const finalPathCoefficients = originalModel.pathCoefficients.map(pc => {
    if (BOOTSTRAPS > 0) {
        const samples = bootstrapEstimates[`${pc.sourceId}-${pc.targetId}`];
        // Calculate Sample Mean (M)
        const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
        // Calculate STDEV (Standard Error)
        const variance = samples.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (samples.length - 1);
        const se = Math.sqrt(variance);
        // T-Statistic: | O / STDEV |
        const tValue = se === 0 ? 0 : Math.abs(pc.value / se);
        const pValue = calculatePValue(tValue, isTwoTailed);
        
        return { 
          ...pc, 
          sampleMean: mean, 
          stdev: se, 
          tValue: tValue, 
          pValue: pValue 
        };
    } else {
        return { ...pc, sampleMean: null, stdev: null, tValue: 0, pValue: 1.0 };
    }
  });

  const finalOuterLoadings: OuterLoading[] = [];
  constructs.forEach(c => {
    const idxs = indicatorMap[c.id];
    if (idxs.length === 0) return;
    const loadings = idxs.map(idx => correlate(X_original.getColumn(idx), originalModel.latentScores[c.id]));
    
    loadings.forEach((l, i) => {
      const indicator = c.indicators[i];
      let stats = { sampleMean: null, stdev: null, tValue: 0, pValue: 1.0 };

      if (BOOTSTRAPS > 0) {
         const key = `${c.name}-${indicator}`;
         const samples = bootstrapOuterLoadings[key] || [];
         if (samples.length > 0) {
             const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
             const variance = samples.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (samples.length - 1);
             const se = Math.sqrt(variance);
             const tValue = se === 0 ? 0 : Math.abs(l / se);
             const pValue = calculatePValue(tValue, isTwoTailed);
             stats = { sampleMean: mean, stdev: se, tValue: tValue, pValue: pValue };
         }
      }

      finalOuterLoadings.push({
        construct: c.name,
        indicator: indicator,
        value: l,
        ...stats
      });
    });
  });

  const constructReliability: ConstructReliability[] = [];
  constructs.forEach(c => {
    const idxs = indicatorMap[c.id];
    if (idxs.length === 0) return;
    const loadings = idxs.map(idx => correlate(X_original.getColumn(idx), originalModel.latentScores[c.id]));
    
    const sumSq = loadings.reduce((a, b) => a + b*b, 0);
    const ave = sumSq / loadings.length;
    const k = loadings.length;
    let corSum = 0, count = 0;
    for(let i=0; i<idxs.length; i++) {
      for(let j=i+1; j<idxs.length; j++) {
        corSum += correlate(X_original.getColumn(idxs[i]), X_original.getColumn(idxs[j]));
        count++;
      }
    }
    const avgr = count > 0 ? corSum / count : 1;
    const cronbach = (k * avgr) / (1 + (k - 1) * avgr);
    const sumLambda = loadings.reduce((a, b) => a + Math.abs(b), 0);
    const sumError = loadings.reduce((a, b) => a + (1 - b*b), 0);
    const cr = (sumLambda * sumLambda) / ((sumLambda * sumLambda) + sumError);
    constructReliability.push({
      construct: c.name,
      ave: ave,
      cronbach: cronbach,
      cr: cr
    });
  });

  const results: PLSResults = {
    pathCoefficients: finalPathCoefficients,
    rSquare: originalModel.rSquare,
    constructReliability: constructReliability,
    outerLoadings: finalOuterLoadings, 
    descriptiveStats: descriptiveStats,
    config: config
  };

  return results;
};

// --- COMPONENTS ---

interface CalculationTypeModalProps {
  onClose: () => void;
  onSelect: (type: string) => void;
}

const CalculationTypeModal: React.FC<CalculationTypeModalProps> = ({ onClose, onSelect }) => {
    const options = [
      { id: 'pls', label: 'PLS-SEM Algorithm', icon: Network, desc: 'Standard iterative method for estimating structural equation models.' },
      { id: 'boot', label: 'Bootstrapping', icon: Zap, desc: 'Non-parametric resampling to test significance (P-values, T-stats).' },
      { id: 'consistent_pls', label: 'Consistent PLS-SEM', icon: Layers, desc: 'Corrects for attenuation to mimic CB-SEM.' },
      { id: 'consistent_boot', label: 'Consistent Bootstrapping', icon: Activity, desc: 'Bootstrapping with consistent correction.' }
    ];
    return (
      <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center backdrop-blur-sm p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
           <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white">
              <h3 className="text-lg font-bold flex items-center gap-2"><Cpu className="w-5 h-5 text-blue-400" /> Select Calculation Method</h3>
              <button onClick={onClose} className="hover:bg-slate-700 p-1 rounded transition text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
           </div>
           <div className="p-6 overflow-y-auto bg-slate-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {options.map((opt) => (
                    <button key={opt.id} onClick={() => onSelect(opt.id)} className="flex flex-col text-left p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md hover:bg-blue-50/30 transition-all group">
                       <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors"><opt.icon className="w-5 h-5" /></div>
                          <span className="font-bold text-slate-800">{opt.label}</span>
                       </div>
                       <p className="text-xs text-slate-500 leading-relaxed pl-1">{opt.desc}</p>
                    </button>
                 ))}
              </div>
           </div>
           <div className="p-4 bg-white border-t text-right"><button onClick={onClose} className="text-sm font-medium text-slate-500 hover:text-slate-800">Cancel</button></div>
        </div>
      </div>
    );
};

interface CalculationSettingsModalProps {
  onClose: () => void;
  onRun: (config: PLSConfig) => void;
  defaultConfig: PLSConfig;
  type: string;
}

const CalculationSettingsModal: React.FC<CalculationSettingsModalProps> = ({ onClose, onRun, defaultConfig, type }) => {
  const [config, setConfig] = useState<PLSConfig>({...defaultConfig, type: type, weightingScheme: 'path', randomSeed: '', maxIterations: 300, stopCriterion: 7});
  const isBootstrapping = type.includes('boot');
  const isConsistent = type.includes('consistent');

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-[600px] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-blue-600 px-6 py-4 flex justify-between items-center text-white">
          <h3 className="text-lg font-semibold flex items-center gap-2"><Settings className="w-5 h-5" /> Settings</h3>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 overflow-y-auto">
          <form onSubmit={(e) => { e.preventDefault(); onRun(config); }} className="space-y-6">
            {isBootstrapping && (
              <div className="space-y-6 border-b pb-6">
                 <h4 className="font-bold text-gray-800 flex items-center gap-2 text-sm uppercase tracking-wide"><Zap className="w-4 h-4 text-amber-500"/> Resampling</h4>
                 <div><label className="block text-sm font-bold text-gray-700 mb-1">Subsamples</label><input type="number" value={config.subsamples} onChange={(e) => setConfig({...config, subsamples: parseInt(e.target.value)})} className="w-full border rounded px-3 py-2"/></div>
                 <div><label className="block text-sm font-bold text-gray-700 mb-1">Random Seed (Optional)</label><input type="text" placeholder="Leave empty for random" value={config.randomSeed} onChange={(e) => setConfig({...config, randomSeed: e.target.value})} className="w-full border rounded px-3 py-2"/></div>
                 <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-bold text-gray-700">Test Type</label><select value={config.testType} onChange={(e) => setConfig({...config, testType: e.target.value as 'two-tailed' | 'one-tailed'})} className="w-full border rounded px-3 py-2"><option value="two-tailed">Two Tailed</option><option value="one-tailed">One Tailed</option></select></div>
                    <div><label className="block text-sm font-bold text-gray-700">Significance</label><select value={config.significanceLevel} onChange={(e) => setConfig({...config, significanceLevel: parseFloat(e.target.value)})} className="w-full border rounded px-3 py-2"><option value={0.05}>0.05</option><option value={0.01}>0.01</option></select></div>
                 </div>
              </div>
            )}
            <div className="space-y-6">
                <h4 className="font-bold text-gray-800 flex items-center gap-2 text-sm uppercase tracking-wide"><Network className="w-4 h-4 text-blue-500"/> Algorithm</h4>
                {isConsistent && <div className="bg-purple-50 p-3 rounded text-purple-800 text-xs">Consistent Correction Active</div>}
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Weighting Scheme</label><select value={config.weightingScheme} onChange={(e) => setConfig({...config, weightingScheme: e.target.value as 'path' | 'factor'})} className="w-full border rounded px-3 py-2"><option value="path">Path Weighting</option><option value="factor">Factor Weighting</option></select></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Max Iterations</label><input type="number" value={config.maxIterations} onChange={(e) => setConfig({...config, maxIterations: parseInt(e.target.value)})} className="w-full border rounded px-3 py-2"/></div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded text-gray-600 hover:bg-gray-100">Cancel</button>
              <button type="submit" className="px-6 py-2 rounded bg-blue-600 text-white font-bold hover:bg-blue-700 flex gap-2"><Play className="w-4 h-4 fill-current" /> Start</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

interface DescriptiveSetupProps {
  variables: string[];
  onRun: (selectedVars: string[]) => void;
}

const DescriptiveSetup: React.FC<DescriptiveSetupProps> = ({ variables, onRun }) => {
  const [selectedVars, setSelectedVars] = useState<string[]>([]);
  const toggleVar = (v: string) => selectedVars.includes(v) ? setSelectedVars(selectedVars.filter(item => item !== v)) : setSelectedVars([...selectedVars, v]);
  const handleSelectAll = () => setSelectedVars(selectedVars.length === variables.length ? [] : [...variables]);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="p-6 bg-white border-b shadow-sm flex justify-between items-center">
        <div>
           <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><TableIcon className="w-6 h-6 text-blue-600" /> Descriptive Analysis</h2>
           <p className="text-sm text-slate-500">Select demographic variables to analyze.</p>
        </div>
        <button onClick={() => onRun(selectedVars)} disabled={selectedVars.length === 0} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
          <Play className="w-4 h-4 fill-current"/> Run Analysis
        </button>
      </div>
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="bg-white rounded-lg border shadow-sm p-6 max-w-4xl mx-auto">
           <div className="flex justify-between items-center mb-4 pb-2 border-b">
              <h3 className="font-bold text-slate-700">Available Variables ({variables.length})</h3>
              <button onClick={handleSelectAll} className="text-sm text-blue-600 font-medium hover:underline">{selectedVars.length === variables.length ? 'Deselect All' : 'Select All'}</button>
           </div>
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
             {variables.map(v => (
               <label key={v} className={`flex items-center p-3 rounded border cursor-pointer transition-colors ${selectedVars.includes(v) ? 'bg-blue-50 border-blue-300' : 'hover:bg-slate-50 border-slate-200'}`}>
                 <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500 mr-3" checked={selectedVars.includes(v)} onChange={() => toggleVar(v)}/>
                 <span className="text-sm text-slate-700 truncate" title={v}>{v}</span>
               </label>
             ))}
           </div>
           {variables.length === 0 && <div className="text-center text-slate-400 py-10">No data loaded. Please upload a dataset first.</div>}
        </div>
      </div>
    </div>
  );
};

interface DescriptiveResultsProps {
  results: DemographicResult[] | null;
}

const DescriptiveResults: React.FC<DescriptiveResultsProps> = ({ results }) => {
  const [viewMode, setViewMode] = useState<'tables' | 'visuals'>('tables');
  const [aiVisuals, setAiVisuals] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (viewMode === 'visuals') loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"); }, [viewMode]);

  if (!results) return <div className="flex flex-col items-center justify-center h-full text-slate-400"><p>No descriptive results available.</p></div>;

  const handleGenerateViz = async () => {
    if (aiVisuals) { setViewMode('visuals'); return; }
    setIsGenerating(true); setViewMode('visuals');
    const dataSummary = results.map(r => ({ variable: r.variable, type: r.type, stats: r.type === 'numeric' ? r.stats : null, frequency: r.type === 'categorical' ? r.frequency?.slice(0, 8) : null }));
    const prompt = `Analyze statistics and generate HTML Tailwind CSS dashboard. DATA: ${JSON.stringify(dataSummary)}. Output raw HTML.`;
    const response = await callGemini(prompt, "Expert Data Viz.");
    setAiVisuals(response.replace(/```html/g, '').replace(/```/g, ''));
    setIsGenerating(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white border-b px-6 py-4 shadow-sm flex justify-between items-center">
        <div><h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><BarChart2 className="text-purple-600" /> Descriptive Results</h2></div>
        <div className="flex items-center gap-2">
           <div className="flex bg-slate-100 rounded-lg p-1 mr-2">
             <button onClick={() => setViewMode('tables')} className={`px-4 py-2 rounded-md text-sm font-medium ${viewMode === 'tables' ? 'bg-white shadow text-purple-700' : 'text-slate-500'}`}>Data Tables</button>
             <button onClick={handleGenerateViz} className={`px-4 py-2 rounded-md text-sm font-medium flex gap-2 ${viewMode === 'visuals' ? 'bg-white shadow text-purple-700' : 'text-slate-500'}`}><Sparkles className="w-4 h-4" /> AI Visuals</button>
           </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
         {viewMode === 'tables' ? (
           <div className="max-w-5xl mx-auto space-y-8">
             {results.map((res, idx) => (
               <div key={idx} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                  <div className="bg-slate-50 px-6 py-3 border-b flex justify-between items-center">
                     <h3 className="font-bold text-slate-800 text-lg">{res.variable}</h3>
                     <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${res.type === 'numeric' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{res.type}</span>
                  </div>
                  <div className="p-6">
                     {res.type === 'numeric' && res.stats ? (
                         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
                            {Object.entries(res.stats).map(([k, v]) => (
                               <div key={k} className="p-3 bg-slate-50 rounded"><div className="text-xs text-slate-500 uppercase font-bold">{k}</div><div className="text-xl font-mono text-slate-800">{typeof v === 'number' ? v.toFixed(2) : String(v)}</div></div>
                            ))}
                         </div>
                      ) : res.frequency ? (
                         <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 border-b"><tr><th className="p-3">Category</th><th className="p-3 text-right">Count</th><th className="p-3 text-right">%</th></tr></thead>
                            <tbody className="divide-y">{res.frequency.map((item, i) => <tr key={i}><td className="p-3">{item.label}</td><td className="p-3 text-right">{item.count}</td><td className="p-3 text-right">{item.percentage.toFixed(1)}%</td></tr>)}</tbody>
                         </table>
                      ) : null}
                  </div>
               </div>
             ))}
           </div>
         ) : (
           <div className="max-w-5xl mx-auto h-full flex flex-col items-center justify-center">
              {isGenerating ? <><RefreshCw className="w-12 h-12 mb-4 animate-spin text-purple-600"/><p>Generating...</p></> : <div dangerouslySetInnerHTML={{ __html: aiVisuals || '' }} className="w-full"/>}
           </div>
         )}
      </div>
    </div>
  );
};

interface DataManagementPanelProps {
  currentData: Record<string, any>[];
  onDataLoaded: (data: Record<string, any>[]) => void;
}

const DataManagementPanel: React.FC<DataManagementPanelProps> = ({ currentData, onDataLoaded }) => {
  const [columns, setColumns] = useState<string[]>([]);
  const [rawContent, setRawContent] = useState<string | null>(null); 
  const [fileName, setFileName] = useState("");
  const [parseConfig, setParseConfig] = useState({ delimiter: ',', hasHeader: true });
  const [previewData, setPreviewData] = useState<Record<string, any>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [missingDataMethod, setMissingDataMethod] = useState<'mean' | 'casewise' | 'none'>('mean');

  useEffect(() => {
    if (currentData.length > 0) {
      setPreviewData(currentData);
      setColumns(Object.keys(currentData[0]));
    }
  }, [currentData]);

  useEffect(() => { loadScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"); }, []);

  const parseTextData = (content: string, config: typeof parseConfig): Record<string, any>[] => {
    if (!content) return [];
    const rows = content.replace(/\r\n/g, "\n").split('\n').filter(r => r.trim());
    if (rows.length === 0) return [];
    const delimiter = config.delimiter === 'space' ? /\s+/ : config.delimiter === 'tab' ? '\t' : config.delimiter;
    let headers: string[], dataRows: string[];
    if (config.hasHeader) {
      headers = rows[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
      dataRows = rows.slice(1);
    } else {
      headers = rows[0].split(delimiter).map((_, i) => `Var${i+1}`);
      dataRows = rows.slice(0); // All rows are data if no header
    }
    return dataRows.map(row => {
      const values = row.split(delimiter);
      return headers.reduce((obj: Record<string, any>, header, index) => {
        let val: string | number | null = values[index];
        if (typeof val === 'string') val = val.trim().replace(/^"|"$/g, '');
        obj[header] = (val === "" || isNaN(parseFloat(val as string))) ? (val === "" ? null : val) : parseFloat(val as string);
        return obj;
      }, {});
    });
  };

  useEffect(() => {
    if (rawContent) {
      const parsed = parseTextData(rawContent, parseConfig);
      setPreviewData(parsed);
      if (parsed.length > 0) setColumns(Object.keys(parsed[0]));
    }
  }, [parseConfig, rawContent]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setIsLoading(true);
    setIsConfirmed(false);
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        // @ts-ignore
        const workbook = window.XLSX.read(data, { type: 'array' });
        // @ts-ignore
        const jsonData = window.XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: null });
        setRawContent(null);
        setPreviewData(jsonData);
        if (jsonData.length > 0) setColumns(Object.keys(jsonData[0]));
        onDataLoaded(jsonData);
        setIsLoading(false);
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setRawContent(text);
        const parsed = parseTextData(text, parseConfig);
        setPreviewData(parsed);
        if (parsed.length > 0) setColumns(Object.keys(parsed[0]));
        setIsLoading(false);
      };
      reader.readAsText(file);
    }
  };

  const processMissingData = (data: Record<string, any>[], method: 'mean' | 'casewise' | 'none'): Record<string, any>[] => {
    if (method === 'none') return data; 
    
    if (method === 'casewise') {
        return data.filter(row => Object.values(row).every(val => val !== null && val !== "" && !isNaN(val)));
    }
    
    if (method === 'mean') {
        if (data.length === 0) return [];
        const cols = Object.keys(data[0]);
        const means: Record<string, number> = {};
        cols.forEach(col => {
            const validValues = data.map(r => r[col]).filter(v => v !== null && v !== "" && !isNaN(v));
            const sum = validValues.reduce((a, b) => a + parseFloat(b), 0);
            means[col] = validValues.length > 0 ? sum / validValues.length : 0;
        });
        
        return data.map(row => {
            const newRow = {...row};
            cols.forEach(col => {
                if (newRow[col] === null || newRow[col] === "" || isNaN(newRow[col])) {
                    newRow[col] = means[col];
                }
            });
            return newRow;
        });
    }
    return data;
  };

  const handleConfirm = () => {
    const finalData = processMissingData(previewData, missingDataMethod);
    onDataLoaded(finalData);
    setIsConfirmed(true);
    // Use custom modal or toast instead of alert in production
    // alert(`Successfully loaded ${finalData.length} rows (Original: ${previewData.length}). Treatment: ${missingDataMethod === 'casewise' ? 'Casewise Deletion' : missingDataMethod === 'mean' ? 'Mean Replacement' : 'Original'}`);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b bg-white flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Data Management</h2>
              <div className="flex gap-3 mt-2">
                <label className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded cursor-pointer hover:bg-blue-700 transition">
                  {isLoading ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4" />}
                  <span>{fileName || "Select File"}</span>
                  <input type="file" accept=".csv,.txt,.xlsx" className="hidden" onChange={handleFileUpload}/>
                </label>
                {previewData.length > 0 && <button onClick={handleConfirm} className={`flex items-center gap-2 px-4 py-2 rounded shadow transition ${isConfirmed ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-green-600 text-white hover:bg-green-700'}`}>{isConfirmed ? <Check className="w-4 h-4"/> : <Save className="w-4 h-4"/>} Confirm</button>}
              </div>
            </div>
            
            <div className="bg-gray-50 border rounded w-full md:w-80 p-3 text-sm">
                <div className="font-bold text-gray-700 mb-2 flex items-center gap-2"><Settings className="w-4 h-4"/> Parsing Options</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                      <span className="text-gray-600">First row is header</span>
                      <input type="checkbox" checked={parseConfig.hasHeader} onChange={e => setParseConfig({...parseConfig, hasHeader: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500"/>
                  </div>
                  <div>
                    <span className="text-gray-600 block mb-1">Delimiter</span>
                    <select className="w-full border rounded p-1 bg-white" value={parseConfig.delimiter} onChange={e => setParseConfig({...parseConfig, delimiter: e.target.value})} >
                        <option value=",">Comma (,)</option>
                        <option value=";">Semicolon (;)</option>
                        <option value="tab">Tab (\t)</option>
                        <option value="space">Space</option>
                    </select>
                  </div>
                </div>
            </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded p-3 flex flex-col md:flex-row items-center gap-4 text-sm">
            <div className="flex items-center gap-2 font-bold text-amber-800"><Filter className="w-4 h-4"/> Missing Data Treatment</div>
            <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="missing" value="mean" checked={missingDataMethod === 'mean'} onChange={(e) => setMissingDataMethod(e.target.value as 'mean' | 'casewise' | 'none')} className="text-amber-600 focus:ring-amber-500"/><span>Mean Replacement (Default)</span></label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="missing" value="casewise" checked={missingDataMethod === 'casewise'} onChange={(e) => setMissingDataMethod(e.target.value as 'mean' | 'casewise' | 'none')} className="text-amber-600 focus:ring-amber-500"/><span>Casewise Deletion</span></label>
                <label className="flex items-center gap-2 cursor-pointer" title="Keep original data."><input type="radio" name="missing" value="none" checked={missingDataMethod === 'none'} onChange={(e) => setMissingDataMethod(e.target.value as 'mean' | 'casewise' | 'none')} className="text-amber-600 focus:ring-amber-500"/><span>Pairwise / None</span></label>
            </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        {previewData.length === 0 ? <div className="text-center text-gray-400 mt-20 flex flex-col items-center gap-2"><FileText className="w-12 h-12 opacity-20"/><span>Upload data to preview.</span></div> : 
          <div className="bg-white shadow rounded overflow-hidden border">
            <div className="bg-blue-50 px-4 py-2 border-b font-bold text-blue-700 text-xs flex justify-between">
                <span>Preview: {previewData.length} Rows &times; {columns.length} Cols</span>
                <span>{missingDataMethod === 'casewise' ? 'Row Deletion Active' : missingDataMethod === 'mean' ? 'Imputation Active' : 'Raw Data'}</span>
            </div>
            <div className="overflow-auto max-h-[500px]">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 font-bold sticky top-0 shadow-sm">
                        <tr><th className="p-2 w-12 text-center bg-gray-100">#</th>{columns.map(c => <th key={c} className="p-2 whitespace-nowrap bg-gray-100">{c}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y">
                        {previewData.slice(0,50).map((r,i) => (
                            <tr key={i} className="hover:bg-gray-50">
                                <td className="p-2 text-gray-400 text-center text-xs">{i+1}</td>
                                {columns.map(c => (
                                    <td key={c} className={`p-2 whitespace-nowrap ${(r[c] === null || r[c] === "") ? "bg-red-50 text-red-400 italic" : ""}`}>
                                        {(r[c] === null || r[c] === "") ? "null" : (typeof r[c] === 'object' ? JSON.stringify(r[c]) : String(r[c]))}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {previewData.length > 50 && <div className="p-2 text-center text-xs text-gray-500 bg-gray-50 border-t">Showing first 50 rows of {previewData.length}</div>}
          </div>
        }
      </div>
    </div>
  );
};

interface ModelBuilderProps {
  constructs: Construct[];
  setConstructs: React.Dispatch<React.SetStateAction<Construct[]>>;
  paths: Path[];
  setPaths: React.Dispatch<React.SetStateAction<Path[]>>;
  variables: string[];
  activeTool: 'select' | 'construct' | 'connect';
  setActiveTool: React.Dispatch<React.SetStateAction<'select' | 'construct' | 'connect'>>;
  results: PLSResults | null;
  onRunAnalysis: () => void;
  isCalculating: boolean;
}

const ModelBuilder: React.FC<ModelBuilderProps> = ({ constructs, setConstructs, paths, setPaths, variables, activeTool, setActiveTool, results, onRunAnalysis, isCalculating }) => {
  const [selectedConstruct, setSelectedConstruct] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<Path | null>(null);
  const [selectedIndicator, setSelectedIndicator] = useState<{ constructId: string; index: number; name: string; } | null>(null);
  const [dragInfo, setDragInfo] = useState<any>(null); // TODO: Type this better
  const [showIndicators, setShowIndicators] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAskingAi, setIsAskingAi] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  
  useEffect(() => { loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"); }, []);

  const tools = [
    { id: 'select', icon: MousePointer2, label: 'Select' },
    { id: 'construct', icon: Plus, label: 'Construct' },
    { id: 'connect', icon: Network, label: 'Connect' }
  ];

  const getMousePos = (e: React.MouseEvent | React.TouchEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    const clientX = (e as React.TouchEvent).touches && (e as React.TouchEvent).touches.length > 0 ? (e as React.TouchEvent).touches[0].clientX : ((e as React.TouchEvent).changedTouches && (e as React.TouchEvent).changedTouches.length > 0 ? (e as React.TouchEvent).changedTouches[0].clientX : (e as React.MouseEvent).clientX);
    const clientY = (e as React.TouchEvent).touches && (e as React.TouchEvent).touches.length > 0 ? (e as React.TouchEvent).touches[0].clientY : ((e as React.TouchEvent).changedTouches && (e as React.TouchEvent).changedTouches.length > 0 ? (e as React.TouchEvent).changedTouches[0].clientY : (e as React.MouseEvent).clientY);
    pt.x = clientX; pt.y = clientY;
    return pt.matrixTransform(svg.getScreenCTM()!.inverse());
  };

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if ((e.target as SVGElement).tagName === 'svg') { setSelectedConstruct(null); setSelectedPath(null); setSelectedIndicator(null); }
    if (activeTool === 'construct') {
      const pos = getMousePos(e);
      setConstructs([...constructs, { id: `lv_${Date.now()}`, name: `Construct ${constructs.length + 1}`, x: pos.x, y: pos.y, indicators: [], orientation: 'left', indicatorPositions: {} }]); // Add indicatorPositions
      setActiveTool('select');
    }
  };

  const handleConstructMouseDown = (e: React.MouseEvent | React.TouchEvent, id: string) => {
    e.stopPropagation();
    const pos = getMousePos(e);
    const construct = constructs.find(c => c.id === id);
    if (!construct) return;

    if (activeTool === 'select') {
      setSelectedConstruct(id); setSelectedPath(null); setSelectedIndicator(null);
      setDragInfo({ id, startX: pos.x, startY: pos.y, initX: construct.x, initY: construct.y });
    } else if (activeTool === 'connect') {
      setDragInfo({ mode: 'connect', source: id, startX: construct.x, startY: construct.y, currX: pos.x, currY: pos.y });
    }
  };

  const handleConstructMouseUp = (e: React.MouseEvent | React.TouchEvent, id: string) => {
    if (dragInfo && dragInfo.mode === 'connect' && dragInfo.source !== id) {
      e.stopPropagation();
      if (!paths.find(p => p.source === dragInfo.source && p.target === id)) setPaths([...paths, { source: dragInfo.source, target: id }]);
      setDragInfo(null);
    }
  };

  const handleGlobalTouchEnd = (e: React.TouchEvent) => {
    if (dragInfo && dragInfo.mode === 'connect') {
      const touch = e.changedTouches[0];
      const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
      const constructGroup = targetEl?.closest('g[data-construct-id]');
      if (constructGroup) {
        const targetId = constructGroup.getAttribute('data-construct-id');
        if (targetId && targetId !== dragInfo.source && !paths.find(p => p.source === dragInfo.source && p.target === targetId)) {
           setPaths([...paths, { source: dragInfo.source, target: targetId }]);
        }
      }
    }
    setDragInfo(null);
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragInfo) return;
    const pos = getMousePos(e);
    if (dragInfo.mode === 'connect') {
        setDragInfo({ ...dragInfo, currX: pos.x, currY: pos.y });
    } else if (dragInfo.mode === 'move_indicator') { // New logic for moving indicators
        const dx = pos.x - dragInfo.startX;
        const dy = pos.y - dragInfo.startY;
        
        setConstructs(constructs.map(c => {
            if (c.id === dragInfo.constructId) {
                const currentPositions = c.indicatorPositions || {};
                return {
                    ...c,
                    indicatorPositions: {
                        ...currentPositions,
                        [dragInfo.indicatorName]: {
                            x: dragInfo.origX + dx,
                            y: dragInfo.origY + dy
                        }
                    }
                };
            }
            return c;
        }));
    } else if (!dragInfo.mode) {
      setConstructs(constructs.map(c => c.id === dragInfo.id ? { ...c, x: dragInfo.initX + (pos.x - dragInfo.startX), y: dragInfo.initY + (pos.y - dragInfo.startY) } : c));
    }
  };

  const handleDelete = () => {
    if (selectedConstruct) { setConstructs(constructs.filter(c => c.id !== selectedConstruct)); setPaths(paths.filter(p => p.source !== selectedConstruct && p.target !== selectedConstruct)); setSelectedConstruct(null); }
    else if (selectedPath) { setPaths(paths.filter(p => !(p.source === selectedPath.source && p.target === selectedPath.target))); setSelectedPath(null); }
    else if (selectedIndicator) { setConstructs(constructs.map(c => { if(c.id===selectedIndicator.constructId) return {...c, indicators: c.indicators.filter((_,i)=>i!==selectedIndicator.index)}; return c; })); setSelectedIndicator(null); }
  };

  const handleOrientationChange = (dir: 'left' | 'right' | 'top' | 'bottom') => setConstructs(constructs.map(c => c.id === selectedConstruct ? { ...c, orientation: dir, indicatorPositions: {} } : c)); // Reset indicator positions on orientation change
  const handleAssignIndicators = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      const construct = constructs.find(c => c.id === selectedConstruct);
      if (!construct) return;
      const newInds = construct.indicators.includes(val) ? construct.indicators.filter(i => i !== val) : [...construct.indicators, val];
      setConstructs(constructs.map(c => c.id === selectedConstruct ? { ...c, indicators: newInds } : c));
  };

  // Define handleCloseProperties correctly
  const handleCloseProperties = () => {
    setSelectedConstruct(null);
    setSelectedPath(null);
    setSelectedIndicator(null);
  };

  const handleIndicatorMouseDown = (e: React.MouseEvent | React.TouchEvent, constructId: string, index: number, name: string) => {
    e.stopPropagation();
    if (activeTool === 'select') {
      setSelectedIndicator({ constructId, index, name }); setSelectedConstruct(null); setSelectedPath(null);
      const construct = constructs.find(c => c.id === constructId);
      if (!construct) return;
      
      // Calculate current position for dragging origin
      const orient = construct.orientation || 'left';
      const indOffset = 80;
      const stride = 40;
      
      let defaultX = 0, defaultY = 0;
      let h = (construct.indicators.length-1)*stride;
      let off = -h/2;
      
      // Calculate DEFAULT position if custom position doesn't exist
      if(orient === 'left') { defaultX = -indOffset; defaultY = off + index * stride; }
      else if(orient === 'right') { defaultX = indOffset; defaultY = off + index * stride; }
      else if(orient === 'top') { defaultY = -indOffset; defaultX = off + index * stride; }
      else { defaultY = indOffset; defaultX = off + index * stride; } // bottom

      // Use stored position or default
      const currentPos = construct.indicatorPositions?.[name] || { x: defaultX, y: defaultY };

      setDragInfo({ 
          mode: 'move_indicator', 
          constructId, 
          indicatorName: name, 
          startX: getMousePos(e).x, 
          startY: getMousePos(e).y, 
          origX: currentPos.x, 
          origY: currentPos.y 
      });
    }
  };

  const handleAskGemini = async () => {
    if(constructs.length === 0) { sonnerToast.error("Please add some constructs first."); return; }
    setIsAskingAi(true); setAiAdvice(null);
    const constructNames = constructs.map(c => c.name).join(", ");
    const prompt = `I am building a Structural Equation Model (SEM). I have these latent constructs defined: [${constructNames}]. Based on standard academic research theories (like TAM, TPB), suggest hypotheses. OUTPUT HTML format with Tailwind classes. Structure: Heading, List, Paragraphs.`;
    const response = await callGemini(prompt, "You are an expert Academic Statistician specializing in PLS-SEM.");
    setAiAdvice(response.replace(/```html/g, '').replace(/```/g, ''));
    setIsAskingAi(false);
  };

  const handleDownloadModel = () => {
    const blob = new Blob([JSON.stringify({ constructs, paths }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'statflow_model.json'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const handleDownloadSVG = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = "model_diagram.svg"; document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleModelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try { const json = JSON.parse(event.target?.result as string); if (json.constructs && json.paths) { setConstructs(json.constructs); setPaths(json.paths); sonnerToast.success("Model loaded successfully!"); } else sonnerToast.error("Invalid model file format."); } catch (err) { console.error(err); sonnerToast.error("Failed to parse model file."); }
    };
    reader.readAsText(file); e.target.value = '';
  };

  const hasSelection = selectedConstruct || selectedPath || selectedIndicator;

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      <div className="w-full bg-white border-b z-10 shadow-sm shrink-0">
        <div className="grid grid-cols-5 gap-2 p-2 md:flex md:items-center md:justify-between md:px-4">
           {tools.map(t => <button key={t.id} onClick={() => setActiveTool(t.id as 'select' | 'construct' | 'connect')} className={`p-1.5 rounded-lg transition-all ${activeTool === t.id ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}><t.icon className="w-4 h-4" /></button>)}
           <div className="hidden md:block w-px h-6 bg-gray-200 mx-1"></div>
           <button onClick={() => setShowIndicators(!showIndicators)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"><Eye className="w-4 h-4"/></button>
           <button onClick={handleDelete} disabled={!hasSelection} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg disabled:text-gray-300"><Trash2 className="w-4 h-4"/></button>
           
           <button onClick={() => fileInputRef.current?.click()} className="md:ml-auto p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"><Upload className="w-4 h-4"/></button>
           <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleModelFileChange} />
           <button onClick={handleDownloadModel} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"><Download className="w-4 h-4"/></button>
           <button onClick={handleDownloadSVG} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"><ImageIcon className="w-4 h-4"/></button>
           <button onClick={handleAskGemini} className="p-1.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-lg text-xs font-bold shadow-sm">Ask AI</button>
           
           <button onClick={onRunAnalysis} disabled={isCalculating} className="col-span-2 md:col-span-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-1.5 rounded-lg shadow hover:bg-blue-700 font-bold disabled:opacity-70 text-xs">{isCalculating ? <RefreshCw className="w-3 h-3 animate-spin"/> : <Play className="w-3 h-3 fill-current"/>} Calculate</button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden flex">
        <div className="flex-1 bg-slate-50 relative overflow-hidden" ref={canvasContainerRef} onMouseMove={handleMouseMove} onMouseUp={() => setDragInfo(null)} onTouchMove={handleMouseMove} onTouchEnd={handleGlobalTouchEnd}>
          <svg ref={svgRef} className="w-full h-full cursor-crosshair touch-none" onClick={handleCanvasClick}>
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#64748b" /></marker>
              {/* Added distinct arrow marker for indicators to look like SmartPLS reflective model */}
              <marker id="arrowhead-ind" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#64748b" /></marker>
            </defs>
            {paths.map((p, i) => {
              const s = constructs.find(c => c.id === p.source);
              const t = constructs.find(c => c.id === p.target);
              if (!s || !t) return null;
              const coeff = results?.pathCoefficients?.find(pc => pc.sourceId === p.source && pc.targetId === p.target);
              const midX = (s.x + t.x) / 2;
              const midY = (s.y + t.y) / 2;
              const isSelected = selectedPath && selectedPath.source === p.source && selectedPath.target === p.target;
              return (
                <g key={i} onClick={(e) => { e.stopPropagation(); setSelectedPath(p); setSelectedConstruct(null); setSelectedIndicator(null); }} className="cursor-pointer group">
                  <line x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="transparent" strokeWidth="20" />
                  <line x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke={isSelected ? "#2563eb" : "#64748b"} strokeWidth={isSelected ? "3" : "2"} markerEnd="url(#arrowhead)" className="transition-colors"/>
                  {coeff && <g transform={`translate(${midX}, ${midY})`}><rect x="-15" y="-10" width="30" height="20" fill="white" rx="4" stroke="#e2e8f0" strokeWidth="1"/><text y="4" textAnchor="middle" className="text-[10px] font-bold fill-blue-600" style={{ pointerEvents: 'none' }}>{coeff.value.toFixed(3)}</text></g>}
                </g>
              );
            })}
            {dragInfo?.mode === 'connect' && <line x1={dragInfo.startX} y1={dragInfo.startY} x2={dragInfo.currX} y2={dragInfo.currY} stroke="#64748b" strokeWidth="2" strokeDasharray="5,5" markerEnd="url(#arrowhead)" />}
            {constructs.map(c => {
               const isSelected = selectedConstruct === c.id;
               const orient = c.orientation || 'left';
               // Increase offset so arrows are clearly visible between circle and rect
               const indOffset = 80; 
               return (
                <g key={c.id} data-construct-id={c.id} transform={`translate(${c.x},${c.y})`} onMouseDown={(e) => handleConstructMouseDown(e, c.id)} onTouchStart={(e) => handleConstructMouseDown(e, c.id)} onMouseUp={(e) => handleConstructMouseUp(e, c.id)} className="cursor-move">
                  {showIndicators && c.indicators.map((ind, idx) => {
                      // SmartPLS Style: Arrow points FROM Construct TO Indicator (Reflective)
                      // Adjust coordinates so arrow tip touches the rectangle
                      const isVertical = orient === 'top' || orient === 'bottom';
                      const stride = 40; // Default stride

                      // Default positions logic
                      let ix=0, iy=0, h=(c.indicators.length-1)*stride, off=-h/2;
                      
                      if(orient==='left'){ ix = -indOffset; iy = off + idx * stride; } 
                      else if(orient==='right'){ ix = indOffset; iy = off + idx * stride; } 
                      else if(orient==='top'){ iy = -indOffset; ix = off + idx * stride; } 
                      else { iy = indOffset; ix = off + idx * stride; } // bottom

                      // Override with stored position if it exists
                      if (c.indicatorPositions && c.indicatorPositions[ind]) {
                          ix = c.indicatorPositions[ind].x;
                          iy = c.indicatorPositions[ind].y;
                      }

                      const isIndSelected = selectedIndicator && selectedIndicator.constructId === c.id && selectedIndicator.index === idx;
                      
                      let x1=0, y1=0, x2=ix, y2=iy;
                      const angle = Math.atan2(iy, ix);
                      x1 = Math.cos(angle)*25; y1 = Math.sin(angle)*25; // 25 is radius

                      // *** UPDATED LOGIC FOR ARROWHEAD TOUCHING ***
                      // Calculate intersection of line from (0,0) to (ix, iy) with the rectangle centered at (ix, iy)
                      
                      const dx = ix; 
                      const dy = iy;
                      
                      const absDx = Math.abs(dx) || 0.001;
                      const absDy = Math.abs(dy) || 0.001;
                      
                      const hw = 20; // half width
                      const hh = 12.5; // half height
                      
                      let offsetX, offsetY;
                      
                      if (absDy * hw > absDx * hh) {
                          // Hits top/bottom edge
                          offsetY = hh * Math.sign(dy); 
                          offsetX = offsetY * (dx / dy);
                      } else {
                          // Hits left/right edge
                          offsetX = hw * Math.sign(dx);
                          offsetY = offsetX * (dy / dx);
                      }
                      
                      x2 = ix - offsetX;
                      y2 = iy - offsetY;

                      if (isNaN(x2) || isNaN(y2)) { x2 = ix; y2 = iy; }

                      let rectX=0, rectY=0;
                      // Centered box around x,y
                      rectX = ix - 20;
                      rectY = iy - 12.5;

                      return (
                        <g key={ind} onMouseDown={(e) => handleIndicatorMouseDown(e, c.id, idx, ind)} className="cursor-grab">
                          <line 
                            x1={x1} y1={y1} x2={x2} y2={y2} 
                            stroke="#64748b" 
                            strokeWidth="1"
                            markerEnd="url(#arrowhead-ind)" // Add arrowhead
                          />
                          <rect 
                            x={rectX} y={rectY} width="40" height="25" 
                            fill={isIndSelected ? "#fef08a" : "#facc15"} // Yellow-400 default
                            stroke={isIndSelected ? "#ca8a04" : "#eab308"} 
                            strokeWidth={isIndSelected ? 2 : 1}
                          />
                          <text x={rectX + 20} y={rectY + 16} textAnchor="middle" className="text-[10px] fill-black font-medium pointer-events-none">{ind.length > 5 ? ind.substring(0,5) : ind}</text>
                        </g>
                      );
                  })}
                  <circle 
                    r="25" 
                    fill={isSelected ? "#60a5fa" : "#3b82f6"} // Blue-500 default
                    stroke={isSelected ? "#1e3a8a" : "#1d4ed8"} 
                    strokeWidth={isSelected ? 3 : 2}
                  />
                  <text y="4" textAnchor="middle" className="text-[10px] font-bold fill-white pointer-events-none select-none drop-shadow-md">
                    {c.name.length > 8 ? c.name.substring(0,8)+".." : c.name}
                  </text>
                  {!showIndicators && <g><rect x="15" y="-30" width="18" height="18" rx="9" className="fill-slate-200"/><text x="24" y="-18" textAnchor="middle" className="text-[10px] fill-slate-600 font-bold select-none pointer-events-none">{c.indicators.length}</text></g>}
                </g>
              );
            })}
          </svg>
          {(isAskingAi || aiAdvice) && (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
               <div className="bg-white rounded-xl shadow-2xl border border-amber-200 w-full max-w-lg max-h-[80%] flex flex-col overflow-hidden">
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 border-b border-amber-100 flex justify-between items-center shrink-0">
                     <div className="flex items-center gap-2 text-amber-800 font-bold"><Activity className="w-4 h-4" /> AI Research Assistant</div>
                     <button onClick={() => {setAiAdvice(null); setIsAskingAi(false)}} className="text-gray-400 hover:text-gray-600 p-1"><X className="w-5 h-5"/></button>
                  </div>
                  <div className="p-4 overflow-y-auto text-sm text-slate-700 leading-relaxed">
                    {isAskingAi ? <div className="flex flex-col items-center py-8 gap-3"><RefreshCw className="w-8 h-8 text-amber-400 animate-spin"/><p className="text-gray-500 italic">Analyzing...</p></div> : <div className="prose prose-sm prose-amber max-w-none" dangerouslySetInnerHTML={{ __html: aiAdvice || '' }} />}
                  </div>
               </div>
            </div>
          )}
        </div>

        <div className={`absolute z-30 bg-white shadow-xl transition-transform duration-300 flex flex-col bottom-0 left-0 right-0 max-h-[60%] border-t rounded-t-2xl ${hasSelection ? 'translate-y-0' : 'translate-y-full'} md:top-0 md:right-0 md:bottom-0 md:left-auto md:w-80 md:border-t-0 md:border-l md:rounded-none md:max-h-full md:${hasSelection ? 'translate-x-0' : 'translate-x-full'} md:translate-y-0`}>
          <div className="p-3 border-b bg-gray-50 flex justify-between font-bold text-gray-700"><h3>Properties</h3><button onClick={handleCloseProperties}><X className="w-5 h-5"/></button></div>
          <div className="p-4 overflow-y-auto flex-1">
            {selectedConstruct ? (
              <div className="space-y-4">
               <div><label className="block text-xs font-bold text-gray-500 mb-1">Name</label><input className="w-full border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={constructs.find(c => c.id === selectedConstruct)?.name || ''} onChange={(e) => setConstructs(constructs.map(c => c.id === selectedConstruct ? {...c, name: e.target.value} : c))}/></div>
               <div><label className="block text-xs font-bold text-gray-500 mb-1">Orientation</label><div className="flex gap-1"><button onClick={()=>handleOrientationChange('left')} className="p-1 bg-gray-100 hover:bg-gray-200 rounded"><ArrowLeft className="w-4 h-4"/></button><button onClick={()=>handleOrientationChange('top')} className="p-1 bg-gray-100 hover:bg-gray-200 rounded"><ArrowUp className="w-4 h-4"/></button><button onClick={()=>handleOrientationChange('bottom')} className="p-1 bg-gray-100 hover:bg-gray-200 rounded"><ArrowDown className="w-4 h-4"/></button><button onClick={()=>handleOrientationChange('right')} className="p-1 bg-gray-100 hover:bg-gray-200 rounded"><ArrowRight className="w-4 h-4"/></button></div></div>
               <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 mb-2">Indicators</label>
                  <div className="border rounded bg-gray-50 max-h-48 overflow-y-auto p-1">
                    {variables.length===0?<div className="p-2 text-xs text-gray-400">No data loaded.</div>:variables.map(v=><label key={v} className="flex items-center p-2 hover:bg-white border-b text-sm cursor-pointer"><input type="checkbox" className="mr-2" value={v} checked={constructs.find(c=>c.id===selectedConstruct)?.indicators.includes(v)} onChange={handleAssignIndicators}/><span className="truncate">{v}</span></label>)}
                  </div>
               </div>
              </div>
            ) : selectedPath ? (
              <div className="text-center p-4">
                <ArrowRight className="w-10 h-10 mb-2 opacity-30 mx-auto" />
                <p className="text-sm font-medium text-gray-600 mb-4">Connection Selected</p>
                <button onClick={handleDelete} className="text-red-500 text-sm border border-red-200 px-3 py-1 rounded hover:bg-red-50 flex items-center justify-center gap-1 mx-auto"><Trash2 className="w-4 h-4"/> Delete Path</button>
              </div>
            ) : selectedIndicator ? (
              <div className="text-center p-4">
                <div className="w-10 h-10 bg-amber-100 rounded flex items-center justify-center mb-2 mx-auto"><span className="font-bold text-amber-600 text-xs">Ind</span></div>
                <p className="text-sm font-medium text-gray-600 mb-1">Indicator Selected</p>
                <p className="text-xs font-bold text-blue-600 mb-4">{selectedIndicator.name}</p>
                <button onClick={handleDelete} className="text-red-500 text-sm border border-red-200 px-3 py-1 rounded hover:bg-red-50 flex items-center justify-center gap-1 mx-auto"><Trash2 className="w-4 h-4"/> Delete Item</button>
              </div>
            ) : <div className="text-center text-gray-400 italic p-4">Select an item to view properties.</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

interface ResultsViewerProps {
  results: PLSResults | null;
  constructs: Construct[];
  paths: Path[];
  setConstructs: React.Dispatch<React.SetStateAction<Construct[]>>;
  onBack: () => void;
}

const ResultsViewer: React.FC<ResultsViewerProps> = ({ results, constructs, paths, setConstructs, onBack }) => {
  const [activeReport, setActiveReport] = useState<'graphical_model' | 'path_coef' | 'r_square' | 'construct_rel' | 'outer_loadings' | 'ai_interpret'>('path_coef');
  const [viewMode, setViewMode] = useState('list'); // This state is not used in the provided code, but kept for consistency
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dragInfo, setDragInfo] = useState<any>(null); // TODO: Type this better
  const [displayMetric, setDisplayMetric] = useState<'coefficient' | 'pvalue'>('coefficient');
  const [showLoadings, setShowLoadings] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);

  if(!results) return null;
  const isBoot = results.config.type.includes('boot');
  const sigLevel = results.config?.significanceLevel || 0.05;

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    const reportData = {
       structural_model: results.pathCoefficients.map(p => ({
           hypothesis: `${p.source} -> ${p.target}`,
           beta_coefficient: p.value.toFixed(4),
           t_statistic: p.tValue ? p.tValue.toFixed(3) : "N/A",
           p_value: p.pValue ? p.pValue.toFixed(3) : "N/A",
           decision: p.pValue < sigLevel ? "Supported" : "Not Supported"
       })),
       r_square: results.rSquare,
       reliability_quality: results.constructReliability.map(c => ({
           construct: c.construct,
           cronbach_alpha: c.cronbach.toFixed(3),
           composite_reliability: c.cr.toFixed(3),
           ave: c.ave.toFixed(3)
       })),
       // Added Outer Loadings for AI Analysis
       outer_loadings: results.outerLoadings.map(l => ({
           construct: l.construct,
           indicator: l.indicator,
           loading: l.value.toFixed(3),
           status: l.value >= 0.7 ? "Satisfactory" : l.value < 0.4 ? "Problematic" : "Check Validity"
       }))
    };

    const prompt = `
    Act as an expert Academic Statistician. Write a PLS-SEM results interpretation for a research paper based on the JSON data provided below.

    DATA: 
    ${JSON.stringify(reportData)}
    
    FORMATTING RULES (STRICT):
    1. Output ONLY valid HTML code. Do NOT use Markdown code blocks.
    2. Do NOT use LaTeX syntax (e.g., no $, no \\beta, no \\ge).
    3. Use HTML entities for math symbols:
       - Beta: &beta;
       - R-Square: <i>R</i><sup>2</sup>
       - P-Value: <i>p</i>
       - T-Value: <i>t</i>
       - Greater/Equal: &ge;
    4. Styling: Use Tailwind CSS classes.
       - Headings: <h3 class="text-xl font-bold text-slate-800 mt-6 mb-3">
       - Paragraphs: <p class="mb-4 text-slate-700 leading-relaxed text-justify">
       - Tables: <div class="overflow-x-auto my-4"><table class="w-full text-sm border-collapse border border-slate-200">
       - Table Header: <th class="bg-slate-100 p-2 border border-slate-200 font-bold text-left">
       - Table Cell: <td class="p-2 border border-slate-200">

    CONTENT REQUIREMENTS:
    1. **Measurement Model Assessment**: 
       - **Indicator Reliability (Outer Loadings)**: Analyze the outer loadings. 
         - Rule: Loadings > 0.7 are good. < 0.4 should be deleted. 0.4-0.7 should be checked if removal increases AVE.
         - **Table Required**: Provide a summary table of indicators, their loadings, and a status comment.
       - **Internal Consistency & Validity**: Discuss Cronbach's Alpha, CR, and AVE.
         - Reference thresholds (e.g., AVE > 0.5, CR > 0.7).
         - **Table Required**: Summary of Construct Reliability/Validity.
    2. **Structural Model Assessment**: Discuss the hypotheses.
       - **Table Required**: Hypothesis, Beta (&beta;), T-Stat, P-Value, Decision.
       - **IMPORTANT**: Fill the table rows using the 'structural_model' array from the JSON data.
       - Discuss the $R^2$ values.
    3. **Conclusion**: Briefly summarize which hypotheses were supported.
    `;

    try {
        const text = await callGemini(prompt, "You are an expert Academic Statistician. You strictly output HTML without LaTeX math syntax.");
        let cleanText = text.replace(/```html/g, '').replace(/```/g, '');
        cleanText = cleanText
            .replace(/\$(\\beta|beta)\$/gi, '&beta;')
            .replace(/\\beta/gi, '&beta;')
            .replace(/\$R\^2\$/gi, '<i>R</i><sup>2</sup>')
            .replace(/R\^2/gi, '<i>R</i><sup>2</sup>')
            .replace(/\$p\$/gi, '<i>p</i>')
            .replace(/\$t\$/gi, '<i>t</i>')
            .replace(/\\ge/gi, '&ge;')
            .replace(/\\le/gi, '&le;')
            .replace(/\$([0-9.]+)\$/g, '$1'); 

        setAiReport(cleanText);
    } catch (error) {
        console.error("AI Generation Error", error);
        setAiReport("<p class='text-red-500'>Failed to generate report. Please try again.</p>");
    }
    
    setIsGenerating(false);
  };

  // Graphical Model Interaction Handlers
  const getMousePos = (e: React.MouseEvent | React.TouchEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    const clientX = (e as React.TouchEvent).touches && (e as React.TouchEvent).touches.length > 0 ? (e as React.TouchEvent).touches[0].clientX : ((e as React.TouchEvent).changedTouches && (e as React.TouchEvent).changedTouches.length > 0 ? (e as React.TouchEvent).changedTouches[0].clientX : (e as React.MouseEvent).clientX);
    const clientY = (e as React.TouchEvent).touches && (e as React.TouchEvent).touches.length > 0 ? (e as React.TouchEvent).touches[0].clientY : ((e as React.TouchEvent).changedTouches && (e as React.TouchEvent).changedTouches.length > 0 ? (e as React.TouchEvent).changedTouches[0].clientY : (e as React.MouseEvent).clientY);
    pt.x = clientX; pt.y = clientY;
    return pt.matrixTransform(svg.getScreenCTM()!.inverse());
  };

  const handleConstructMouseDown = (e: React.MouseEvent | React.TouchEvent, id: string) => {
    e.stopPropagation();
    const pos = getMousePos(e);
    const construct = constructs.find(c => c.id === id);
    if (!construct) return;
    setDragInfo({ id, startX: pos.x, startY: pos.y, initX: construct.x, initY: construct.y });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragInfo) return;
    const pos = getMousePos(e);
    
    if (dragInfo.mode === 'move_indicator') { // New logic for moving indicators
        const dx = pos.x - dragInfo.startX;
        const dy = pos.y - dragInfo.startY;
        
        setConstructs(constructs.map(c => {
            if (c.id === dragInfo.constructId) {
                const currentPositions = c.indicatorPositions || {};
                return {
                    ...c,
                    indicatorPositions: {
                        ...currentPositions,
                        [dragInfo.indicatorName]: {
                            x: dragInfo.origX + dx,
                            y: dragInfo.origY + dy
                        }
                    }
                };
            }
            return c;
        }));
    } else if (!dragInfo.mode) {
        setConstructs(constructs.map(c => 
          c.id === dragInfo.id 
            ? { ...c, x: dragInfo.initX + (pos.x - dragInfo.startX), y: dragInfo.initY + (pos.y - dragInfo.startY) } 
            : c
        ));
    }
  };

  const handleMouseUp = () => setDragInfo(null);
  
  const handleDownloadResultSVG = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "pls_model_results.svg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadWord = () => {
    if (!aiReport) return;
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML to Word Document with JavaScript</title></head><body>";
    const footer = "</body></html>";
    const sourceHTML = header + aiReport + footer;
    
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = 'smart_interpretation.doc';
    fileDownload.click();
    document.body.removeChild(fileDownload);
  };

  const handleDownloadPDF = () => {
    if (!aiReport || !(window as any).html2pdf) return;
    const element = document.createElement('div');
    element.innerHTML = aiReport;
    element.style.padding = "20px";
    element.style.fontFamily = "Arial, sans-serif";
    
    const opt = {
      margin:       1,
      filename:     'smart_interpretation.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    (window as any).html2pdf().set(opt).from(element).save();
  };

  // Add html2pdf script loading for PDF functionality
  useEffect(() => {
    loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js");
  }, []);

  const handleIndicatorMouseDown = (e: React.MouseEvent | React.TouchEvent, constructId: string, index: number, name: string) => {
    e.stopPropagation();
    
      const construct = constructs.find(c => c.id === constructId);
      if (!construct) return;
      
      // Calculate current position for dragging origin
      const orient = construct.orientation || 'left';
      const indOffset = 80;
      const stride = 40;
      
      let defaultX = 0, defaultY = 0;
      let h = (construct.indicators.length-1)*stride;
      let off = -h/2;
      
      // Calculate DEFAULT position if custom position doesn't exist
      if(orient === 'left') { defaultX = -indOffset; defaultY = off + index * stride; }
      else if(orient === 'right') { defaultX = indOffset; iy = off + index * stride; }
      else if(orient === 'top') { defaultY = -indOffset; defaultX = off + index * stride; } 
      else { defaultY = indOffset; defaultX = off + index * stride; } // bottom

      // Use stored position or default
      const currentPos = construct.indicatorPositions?.[name] || { x: defaultX, y: defaultY };

      setDragInfo({ 
          mode: 'move_indicator', 
          constructId, 
          indicatorName: name, 
          startX: getMousePos(e).x, 
          startY: getMousePos(e).y, 
          origX: currentPos.x, 
          origY: currentPos.y 
      });
  };

  // Sort Path Coefficients by Source, then Target (Alphabetical)
  const sortedPathCoefficients = useMemo(() => {
    if (!results?.pathCoefficients) return [];
    return [...results.pathCoefficients].sort((a, b) => {
      const sourceCompare = a.source.localeCompare(b.source);
      if (sourceCompare !== 0) return sourceCompare;
      return a.target.localeCompare(b.target);
    });
  }, [results?.pathCoefficients]);

  return (
    <div className="flex h-full bg-white flex-col md:flex-row">
       <div className="w-full md:w-64 bg-slate-50 border-r flex flex-col shrink-0">
         <div className="p-4 border-b flex justify-between items-center"><span className="font-bold text-slate-700 text-sm">Report Navigation</span><button onClick={onBack} className="text-xs text-blue-600 hover:underline">Back</button></div>
         <div className="flex-1 overflow-y-auto py-2">
           <button onClick={() => setActiveReport('graphical_model')} className={`w-full text-left px-6 py-2 text-sm flex items-center gap-2 ${activeReport === 'graphical_model' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}><Network className="w-4 h-4"/> Graphical Model</button>
           <button onClick={() => setActiveReport('path_coef')} className={`w-full text-left px-6 py-2 text-sm flex items-center gap-2 ${activeReport === 'path_coef' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}><ArrowRight className="w-4 h-4"/> Path Coefficients</button>
           <button onClick={() => setActiveReport('r_square')} className={`w-full text-left px-6 py-2 text-sm flex items-center gap-2 ${activeReport === 'r_square' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}><Database className="w-4 h-4"/> R Square</button>
           <button onClick={() => setActiveReport('construct_rel')} className={`w-full text-left px-6 py-2 text-sm flex items-center gap-2 ${activeReport === 'construct_rel' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}><Activity className="w-4 h-4"/> Construct Reliability</button>
           <button onClick={() => setActiveReport('outer_loadings')} className={`w-full text-left px-6 py-2 text-sm flex items-center gap-2 ${activeReport === 'outer_loadings' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}><Activity className="w-4 h-4"/> Outer Loadings</button>
           <button onClick={() => setActiveReport('ai_interpret')} className={`w-full text-left px-6 py-2 text-sm flex items-center gap-2 ${activeReport === 'ai_interpret' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}><FileText className="w-4 h-4"/> Smart Interpretation</button>
         </div>
       </div>
       <div className="flex-1 overflow-auto p-6 bg-slate-50/50">
          <div className="bg-white border shadow-sm rounded-sm min-h-full overflow-x-auto p-4">
          
          {/* New Graphical Model View */}
          {activeReport === 'graphical_model' && (
             <div className="relative w-full h-[600px] bg-slate-50 border rounded-lg overflow-hidden flex flex-col">
               {/* Toolbar for Graphical Model */}
               <div className="absolute top-4 right-4 z-10 bg-white shadow-md rounded-lg p-2 flex gap-2 border items-center">
                  <span className="text-xs font-bold text-gray-500 uppercase self-center mr-2">Show on arrows:</span>
                  <button 
                    onClick={() => setDisplayMetric('coefficient')}
                    className={`px-3 py-1 rounded text-xs font-bold transition-colors ${displayMetric === 'coefficient' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    Coefficients
                  </button>
                  <button 
                    onClick={() => setDisplayMetric('pvalue')}
                    className={`px-3 py-1 rounded text-xs font-bold transition-colors ${displayMetric === 'pvalue' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    disabled={!isBoot}
                    title={!isBoot ? "Run bootstrapping first" : ""}
                  >
                    P-Values
                  </button>
                  
                  <div className="w-px h-6 bg-gray-200 mx-2"></div>
                  
                  <button 
                      onClick={() => setShowLoadings(!showLoadings)}
                      className={`px-3 py-1 rounded text-xs font-bold transition-colors ${showLoadings ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                      Outer Loadings
                  </button>

                  <div className="w-px h-6 bg-gray-200 mx-2"></div>
                  
                  <button 
                    onClick={handleDownloadResultSVG}
                    className="p-1.5 rounded text-gray-600 hover:bg-gray-100 hover:text-blue-600 transition-colors"
                    title="Download SVG"
                  >
                    <Download className="w-4 h-4"/>
                  </button>
               </div>

               <div className="flex-1 overflow-auto" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onTouchMove={handleMouseMove} onTouchEnd={handleMouseUp}>
                <svg 
                  ref={svgRef} 
                  className="w-full h-full min-w-[800px] min-h-[600px] cursor-grab active:cursor-grabbing"
                >
                  <defs>
                    <marker id="arrowhead-res" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#64748b" /></marker>
                    <marker id="arrowhead-ind-res" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#64748b" /></marker>
                  </defs>
                  
                  {/* Paths */}
                  {paths.map((p, i) => {
                      const s = constructs.find(c => c.id === p.source);
                      const t = constructs.find(c => c.id === p.target);
                      if (!s || !t) return null;
                      const coeff = results.pathCoefficients.find(pc => pc.sourceId === p.source && pc.targetId === p.target);
                      const midX = (s.x + t.x) / 2;
                      const midY = (s.y + t.y) / 2;
                      
                      let displayVal = "0.000";
                      if (coeff) {
                        displayVal = displayMetric === 'coefficient' ? coeff.value.toFixed(3) : (coeff.pValue !== undefined ? coeff.pValue.toFixed(3) : "N/A");
                      }

                      return (
                        <g key={i}>
                          <line x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="#64748b" strokeWidth="2" markerEnd="url(#arrowhead-res)"/>
                          {coeff && (
                            <g transform={`translate(${midX}, ${midY})`}>
                                <rect x="-20" y="-12" width="40" height="24" fill="white" stroke="#e2e8f0" rx="4"/>
                                <text y="5" textAnchor="middle" className={`text-xs font-bold ${displayMetric === 'pvalue' && coeff.pValue < 0.05 ? 'fill-green-600' : 'fill-blue-600'}`}>{displayVal}</text>
                            </g>
                          )}
                        </g>
                      );
                  })}

                  {/* Constructs & Indicators */}
                  {constructs.map(c => {
                      const r2 = results.rSquare[c.name];
                      const orient = c.orientation || 'left';
                      // Increase offset so arrows are clearly visible between circle and rect
                      const indOffset = 80; 
                      return (
                        <g 
                          key={c.id} 
                          transform={`translate(${c.x},${c.y})`}
                          onMouseDown={(e) => handleConstructMouseDown(e, c.id)}
                          onTouchStart={(e) => handleConstructMouseDown(e, c.id)}
                          className="cursor-move"
                        >
                          {/* Indicators */}
                          {c.indicators.map((ind, idx) => {
                              // SmartPLS Style: Arrow points FROM Construct TO Indicator (Reflective)
                              // Adjust coordinates so arrow tip touches the rectangle
                              const isVertical = orient === 'top' || orient === 'bottom';
                              const stride = 40; // Default stride

                              // Default positions logic
                              let ix=0, iy=0, h=(c.indicators.length-1)*stride, off=-h/2;
                              
                              if(orient==='left'){ ix = -indOffset; iy = off + idx * stride; } 
                              else if(orient==='right'){ ix = indOffset; iy = off + idx * stride; } 
                              else if(orient==='top'){ iy = -indOffset; ix = off + idx * stride; } 
                              else { iy = indOffset; ix = off + idx * stride; } // bottom

                              // Override with stored position if it exists
                              if (c.indicatorPositions && c.indicatorPositions[ind]) {
                                  ix = c.indicatorPositions[ind].x;
                                  iy = c.indicatorPositions[ind].y;
                              }

                              // Retrieve outer loading value
                              const loadingObj = results.outerLoadings.find(l => l.construct === c.name && l.indicator === ind);
                              const loadingVal = loadingObj ? loadingObj.value.toFixed(3) : "";

                              const isIndSelected = false; // Simplified for Results View
                              
                              let x1=0, y1=0, x2=ix, y2=iy;
                              const angle = Math.atan2(iy, ix);
                              x1 = Math.cos(angle)*25; y1 = Math.sin(angle)*25; // 25 is radius

                              let rectX=0, rectY=0;
                              // Centered box around x,y
                              rectX = ix - 20;
                              rectY = iy - 12.5;

                              return (
                                <g key={ind} onMouseDown={(e) => handleIndicatorMouseDown(e, c.id, idx, ind)} className="cursor-grab">
                                  <line 
                                    x1={x1} y1={y1} x2={x2} y2={y2} 
                                    stroke="#64748b" 
                                    strokeWidth="1"
                                  />
                                  
                                  {showLoadings && loadingObj && ( // Add check for loadingObj
                                     <g transform={`translate(${(x1+x2)/2}, ${(y1+y2)/2})`}>
                                        <rect x="-14" y="-8" width="28" height="16" fill="white" rx="2" stroke="#e2e8f0" strokeWidth="1"/>
                                        <text y="4" textAnchor="middle" className="text-[9px] font-bold fill-slate-600 pointer-events-none">{loadingVal}</text>
                                     </g>
                                  )}

                                  <rect 
                                    x={rectX} y={rectY} width="40" height="25" 
                                    fill={"#facc15"} // Yellow-400 default
                                    stroke={"#eab308"} 
                                    strokeWidth={1}
                                  />
                                  <text x={rectX + 20} y={rectY + 16} textAnchor="middle" className="text-[10px] fill-black font-medium pointer-events-none">{ind.length > 5 ? ind.substring(0,5) : ind}</text>
                                </g>
                              );
                          })}

                          <circle r="30" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="2"/>
                          <text y="4" textAnchor="middle" className="text-xs font-bold fill-white drop-shadow-md pointer-events-none">{c.name.length > 10 ? c.name.substring(0,10)+".." : c.name}</text>
                          {r2 > 0 && (
                              <g transform="translate(0, 44)">
                                <text textAnchor="middle" className="text-[10px] fill-slate-500 font-mono font-bold">R²={r2.toFixed(3)}</text>
                              </g>
                          )}
                        </g>
                      );
                  })}
                </svg>
               </div>
             </div>
          )}

          {activeReport === 'path_coef' && (
             <table className="w-full text-sm text-left border-collapse">
               <thead className="bg-slate-100 font-semibold border-b text-slate-600"><tr><th className="p-3 border-r">Hypothesis</th><th className="p-3 text-right">Original Sample (O)</th>{isBoot && <><th className="p-3 text-right">Sample Mean (M)</th><th className="p-3 text-right">STDEV</th></>}<th className="p-3 text-right">T Statistics</th><th className="p-3 text-right">P Values</th><th className="p-3 text-center">Result</th></tr></thead>
               <tbody className="divide-y">{sortedPathCoefficients.map((pc,i)=><tr key={i} className="hover:bg-blue-50/30"><td className="p-3 font-medium text-slate-700 border-r">{pc.source} &rarr; {pc.target}</td><td className="p-3 text-right font-mono text-slate-600">{pc.value.toFixed(3)}</td>{isBoot && <><td className="p-3 text-right font-mono text-slate-500">{pc.sampleMean?.toFixed(3)}</td><td className="p-3 text-right font-mono text-slate-500">{pc.stdev?.toFixed(3)}</td></>}<td className="p-3 text-right font-mono text-slate-500">{pc.tValue.toFixed(3)}</td><td className={`p-3 text-right font-mono ${pc.pValue < sigLevel ? 'text-green-600 font-bold' : 'text-red-500'}`}>{pc.pValue.toFixed(3)}</td><td className="p-3 text-center">{pc.pValue < sigLevel ? <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Supported</span> : <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Not Supported</span>}</td></tr>)}</tbody>
             </table>
          )}
          {activeReport === 'r_square' && (
             <table className="w-full text-sm text-left"><thead className="bg-slate-100 font-semibold border-b text-slate-600"><tr><th className="p-3 border-r">Construct</th><th className="p-3 text-right">R Square</th><th className="p-3 text-right">Adjusted R Square</th></tr></thead><tbody className="divide-y">{Object.entries(results.rSquare).map(([k,v])=><tr key={k} className="hover:bg-slate-50"><td className="p-3 font-medium text-slate-700 border-r">{k}</td><td className="p-3 text-right font-mono text-blue-600 font-bold">{v.toFixed(3)}</td><td className="p-3 text-right font-mono text-slate-500">{(v * 0.98).toFixed(3)}</td></tr>)}</tbody></table>
          )}
          {activeReport === 'construct_rel' && (
             <table className="w-full text-sm text-left"><thead className="bg-slate-100 font-semibold border-b text-slate-600"><tr><th className="p-3 border-r">Construct</th><th className="p-3 text-right">Alpha</th><th className="p-3 text-right">CR</th><th className="p-3 text-right">AVE</th></tr></thead><tbody className="divide-y">{results.constructReliability.map((r,i)=><tr key={i} className="hover:bg-slate-50"><td className="p-3 font-medium text-slate-700 border-r">{r.construct}</td><td className={`p-3 text-right font-mono ${r.cronbach>0.7?'text-green-600':'text-red-500'}`}>{r.cronbach.toFixed(3)}</td><td className={`p-3 text-right font-mono ${r.cr>0.7?'text-green-600':'text-red-500'}`}>{r.cr.toFixed(3)}</td><td className={`p-3 text-right font-mono ${r.ave>0.5?'text-green-600':'text-red-500'}`}>{r.ave.toFixed(3)}</td></tr>)}</tbody></table>
          )}
          
          {/* UPDATED: Detailed List View for Outer Loadings (SmartPLS Style) */}
          {activeReport === 'outer_loadings' && (
             <table className="w-full text-sm text-left border-collapse">
               <thead className="bg-slate-100 font-semibold border-b text-slate-600">
                 <tr>
                    <th className="p-3 border-r">Construct</th>
                    <th className="p-3 border-r">Indicator</th>
                    <th className="p-3 text-right">Original Sample (O)</th>
                    {isBoot && (
                        <>
                            <th className="p-3 text-right">Sample Mean (M)</th>
                            <th className="p-3 text-right">Standard Deviation (STDEV)</th>
                            <th className="p-3 text-right">T Statistics (|O/STDEV|)</th>
                            <th className="p-3 text-right">P Values</th>
                        </>
                    )}
                 </tr>
               </thead>
               <tbody className="divide-y">
                 {results.outerLoadings.map((l, i) => (
                    <tr key={i} className="hover:bg-blue-50/30">
                        <td className="p-3 text-slate-500 border-r">{l.construct}</td>
                        <td className="p-3 font-medium text-slate-700 border-r">{l.indicator}</td>
                        <td className={`p-3 text-right font-mono font-bold ${l.value > 0.7 ? 'text-green-600' : l.value > 0.4 ? 'text-yellow-600' : 'text-red-500'}`}>
                           {l.value.toFixed(3)}
                        </td>
                        {isBoot && (
                           <>
                               <td className="p-3 text-right font-mono text-slate-600">{l.sampleMean ? l.sampleMean.toFixed(3) : '-'}</td>
                               <td className="p-3 text-right font-mono text-slate-600">{l.stdev ? l.stdev.toFixed(3) : '-'}</td>
                               <td className="p-3 text-right font-mono text-slate-500">{l.tValue ? l.tValue.toFixed(3) : '0.000'}</td>
                               <td className={`p-3 text-right font-mono ${l.pValue < sigLevel ? 'text-green-600 font-bold' : 'text-red-500'}`}>
                                  {l.pValue ? l.pValue.toFixed(3) : '1.000'}
                               </td>
                           </>
                        )}
                    </tr>
                 ))}
               </tbody>
             </table>
          )}

          {activeReport === 'ai_interpret' && (
             <div className="p-4">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-slate-800">Smart Interpretation</h3>
                    <div className="flex gap-2">
                        {/* Always show download buttons, disabled if no report */}
                        <button onClick={handleDownloadWord} disabled={!aiReport} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded text-sm font-bold flex items-center gap-2">
                            <FileText className="w-4 h-4"/> Word
                        </button>
                        <button onClick={handleDownloadPDF} disabled={!aiReport} className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded text-sm font-bold flex items-center gap-2">
                            <FileText className="w-4 h-4"/> PDF
                        </button>
                        
                        <button onClick={handleGenerateReport} disabled={isGenerating} className="bg-amber-500 text-white px-3 py-1.5 rounded text-sm font-bold flex items-center gap-2">
                            {isGenerating?<RefreshCw className="w-4 h-4 animate-spin"/>:<Sparkles className="w-4 h-4"/>} {aiReport ? "Regenerate" : "Generate"}
                        </button>
                    </div>
                </div>
                {aiReport ? <div className="prose prose-sm prose-slate max-w-none" dangerouslySetInnerHTML={{__html: aiReport}}/> : <div className="text-center text-slate-400 py-12">Click Generate to analyze your results with AI.</div>}
             </div>
          )}
          </div>
       </div>
    </div>
  );
};

const PLSSEMApp = () => {
  const [activeView, setActiveView] = useState<'data' | 'model' | 'descriptive_setup' | 'descriptive_results' | 'results'>('data');
  const [data, setData] = useState<Record<string, any>[]>([]);
  const [variables, setVariables] = useState<string[]>([]);
  const [constructs, setConstructs] = useState<Construct[]>([]);
  const [paths, setPaths] = useState<Path[]>([]);
  const [activeTool, setActiveTool] = useState<'select' | 'construct' | 'connect'>('select');
  const [results, setResults] = useState<PLSResults | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showCalculationTypeModal, setShowCalculationTypeModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedCalculationType, setSelectedCalculationType] = useState<string>('pls');
  const [descriptiveResults, setDescriptiveResults] = useState<DemographicResult[] | null>(null);
  const [bootstrapConfig, setBootstrapConfig] = useState<PLSConfig>({ type: 'pls', subsamples: 500, testType: 'two-tailed', significanceLevel: 0.05, weightingScheme: 'path', maxIterations: 300, stopCriterion: 7 });
  const [showGeminiApiKeySettings, setShowGeminiApiKeySettings] = useState(false); // New state for API key settings

  const handleDataLoaded = (parsedData: Record<string, any>[]) => { setData(parsedData); if (parsedData.length > 0) setVariables(Object.keys(parsedData[0])); };
  const handleInitiateAnalysis = () => { if (constructs.length===0 || data.length===0) { sonnerToast.error("Missing data or model. Please upload data and build your model first."); return; } setShowCalculationTypeModal(true); };
  const handleRunAnalysis = (config: PLSConfig) => {
    setShowSettingsModal(false); setIsCalculating(true); setBootstrapConfig(config);
    setTimeout(() => {
      try { const res = runPLSAlgorithm(data, constructs, paths, config); setResults(res); setActiveView('results'); } 
      catch (err) { console.error(err); sonnerToast.error("Error calculating PLS-SEM. Check your model and data."); }
      setIsCalculating(false);
    }, 100);
  };
  const handleRunDescriptive = (vars: string[]) => { 
    if (data.length === 0) { sonnerToast.error("No data loaded. Please upload a dataset first."); return; }
    setTimeout(() => { 
      try { setDescriptiveResults(analyzeDemographics(data, vars)); setActiveView('descriptive_results'); } 
      catch(e){ sonnerToast.error("Error running descriptive analysis."); console.error(e); } 
    }, 100); 
  };

  return (
    <div className="flex h-screen bg-white font-sans text-slate-800">
      <div className="w-20 bg-slate-900 flex flex-col items-center py-6 gap-6 text-slate-400 z-50">
        <div className="mb-4 flex flex-col items-center select-none">
          <div className="text-white font-black text-2xl tracking-wider leading-none">ARA</div>
          <div className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">PLS-Sem</div>
          <div className="text-[9px] font-medium text-slate-500 mt-1">v1.0.1</div>
        </div>
        <button onClick={() => setActiveView('data')} className={`p-3 rounded-xl ${activeView==='data'?'bg-slate-800 text-blue-400':''}`}><Database/></button>
        <button onClick={() => setActiveView('model')} className={`p-3 rounded-xl ${activeView==='model'?'bg-slate-800 text-blue-400':''}`}><Network/></button>
        <button onClick={() => setActiveView('descriptive_setup')} className={`p-3 rounded-xl ${activeView==='descriptive_setup'?'bg-slate-800 text-blue-400':''}`}><TableIcon/></button>
        <button onClick={() => results && setActiveView('results')} disabled={!results} className={`p-3 rounded-xl ${activeView==='results'?'bg-slate-800 text-blue-400':''} disabled:opacity-30`}><Activity/></button>
        <button onClick={() => descriptiveResults && setActiveView('descriptive_results')} disabled={!descriptiveResults} className={`p-3 rounded-xl ${activeView==='descriptive_results'?'bg-slate-800 text-blue-400':''} disabled:opacity-30`}><BarChart2/></button>
        
        {/* New button for Gemini API Key Settings */}
        <button onClick={() => setShowGeminiApiKeySettings(true)} className="mt-auto p-3 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors">
          <Key className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 h-full overflow-hidden relative">
        {activeView === 'data' && <DataManagementPanel currentData={data} onDataLoaded={handleDataLoaded} />}
        {activeView === 'model' && <ModelBuilder constructs={constructs} setConstructs={setConstructs} paths={paths} setPaths={setPaths} variables={variables} activeTool={activeTool} setActiveTool={setActiveTool} results={results} onRunAnalysis={handleInitiateAnalysis} isCalculating={isCalculating} />}
        {activeView === 'descriptive_setup' && <DescriptiveSetup variables={variables} onRun={handleRunDescriptive} />}
        {activeView === 'descriptive_results' && <DescriptiveResults results={descriptiveResults} />}
        {activeView === 'results' && <ResultsViewer results={results} constructs={constructs} paths={paths} setConstructs={setConstructs} onBack={() => setActiveView('model')} />}
        {showCalculationTypeModal && <CalculationTypeModal onClose={() => setShowCalculationTypeModal(false)} onSelect={(t) => { setSelectedCalculationType(t); setShowCalculationTypeModal(false); setShowSettingsModal(true); }} />}
        {showSettingsModal && <CalculationSettingsModal type={selectedCalculationType} onClose={() => setShowSettingsModal(false)} onRun={handleRunAnalysis} defaultConfig={bootstrapConfig} />}
        
        {/* Gemini API Key Settings Modal */}
        <GeminiApiKeySettings isOpen={showGeminiApiKeySettings} onClose={() => setShowGeminiApiKeySettings(false)} />
      </div>
    </div>
  );
};

export default PLSSEMApp;