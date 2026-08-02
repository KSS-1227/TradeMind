import React, { useState, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, RefreshCw, MessageSquare } from "lucide-react";
import { PageTransition } from "../../components/animations/PageTransition";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { AgentLoader } from "../../components/animations/AgentLoader";
import { ScamGauge } from "../../components/scam/ScamGauge";
import { ScamInputForm } from "../../components/scam/ScamInputForm";
import { EvidenceChips } from "../../components/scam/EvidenceChips";
import { AIExplanationCard } from "../../components/scam/AIExplanationCard";
import { InvestigationTimeline } from "../../components/scam/InvestigationTimeline";
import { RecommendedActions } from "../../components/scam/RecommendedActions";
import { analyzeScamMessage } from "../../services/marketService";
import { isDemoModeEnabled } from "../../utils/demoMode";
import { toast } from "sonner";
import "../../styles/scam-detector.css";

const INVESTIGATION_STAGES = [
  "Rule Engine — checking 24 fraud patterns",
  "Pump Detection — calculating upper circuit risk",
  "URL Analysis — scanning malicious links",
  "FinBERT Model — running sentiment analysis",
  "Risk Fusion — aggregating model outputs",
  "AI Explanation — generating security report",
];

export function ScamDetectorPage() {
  const context = useOutletContext();
  const isMobile = context?.isMobile || false;

  const formRef = useRef(null);

  // States: 'input' | 'loading' | 'results' | 'error'
  const [viewState, setViewState] = useState("input");
  const [loaderStep, setLoaderStep] = useState(0);
  const [scamData, setScamData] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);
  const [lastSubmittedPayload, setLastSubmittedPayload] = useState(null);
  const [latencyMs, setLatencyMs] = useState(180);

  const scrollToForm = () => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleAnalyze = async (payload) => {
    if (isDemoModeEnabled()) {
      setLastSubmittedPayload(payload);
      setViewState("loading");
      setLoaderStep(0);
      setErrorDetails(null);
      setTimeout(() => {
        setScamData({
          risk_score: 74,
          classification: "High Risk Scam",
          confidence: 0.91,
          available_models: ["Rule Engine", "FinBERT", "URL Checker"],
          explanation: {
            summary: "The demo message appears to be a coordinated pump-and-dump style scam with urgency and fake authority cues.",
            reasoning: ["The message creates urgency and pressure to act immediately.", "It references a high-return promise without verifiable evidence."],
            recommendation: "Do not act on this tip and report it to the relevant platform.",
          },
          evidence: {
            red_flags: ["Urgency language", "Guaranteed profits", "Unverified source"],
            pump_patterns: ["Coordinated hype language"],
            url_findings: ["Suspicious shortened link"],
            sentiment: "negative",
            sentiment_summary: "The message sentiment is strongly negative and promotional."
          }
        });
        setViewState("results");
        toast.success("Demo scam analysis is ready.");
      }, 900);
      return;
    }

    setLastSubmittedPayload(payload);
    setViewState("loading");
    setLoaderStep(0);
    setErrorDetails(null);

    const startTime = performance.now();
    let apiPromise = analyzeScamMessage(payload);
    let stageInterval;

    try {
      let currentStep = 0;
      stageInterval = setInterval(() => {
        currentStep++;
        if (currentStep < INVESTIGATION_STAGES.length - 1) {
          setLoaderStep(currentStep);
        } else {
          clearInterval(stageInterval);
        }
      }, 400);

      const res = await apiPromise;
      clearInterval(stageInterval);

      const elapsed = Math.round(performance.now() - startTime);
      setLatencyMs(elapsed);

      setLoaderStep(INVESTIGATION_STAGES.length - 1);
      await new Promise((resolve) => setTimeout(resolve, 350));

      if (res && (res.success !== false) && (res.data || res.classification)) {
        const data = res.data || res;
        const requestId = res.request_id || res.data?.request_id || null;

        setScamData({
          ...data,
          requestId,
        });

        setViewState("results");
        toast.success("AI Scam Investigation complete!");
      } else {
        const errObj = new Error(res?.error?.message || res?.message || "Failed to analyze message.");
        errObj.code = res?.error?.code || "ANALYSIS_FAILED";
        errObj.requestId = res?.request_id;
        throw errObj;
      }
    } catch (err) {
      clearInterval(stageInterval);
      setErrorDetails({
        message: err.message || "An error occurred during scam analysis.",
        code: err.code || err.status || "API_ERROR",
        requestId: err.requestId || err.data?.request_id || "req_" + Math.random().toString(36).substring(2, 9),
      });
      setViewState("error");
      toast.error("Scam detection could not be completed.");
    }
  };

  const handleRetry = () => {
    if (lastSubmittedPayload) {
      handleAnalyze(lastSubmittedPayload);
    } else {
      setViewState("input");
    }
  };

  return (
    <PageTransition>
      <div style={{ maxWidth: "1280px", margin: "0 auto", paddingBottom: "40px" }}>
        {/* SECTION 1: HERO */}
        <section style={{ marginBottom: "32px", textAlign: "left" }}>
          <div className="sd-hero-shield">
            <ShieldAlert size={32} />
          </div>

          <h1 className="sd-hero-title">AI Scam Detector</h1>

          <p className="sd-hero-subtitle">
            Analyze WhatsApp messages, Telegram tips, SMS, Emails and investment recommendations using multiple AI models.
          </p>

          <Button
            variant="danger"
            size="lg"
            icon={ShieldAlert}
            onClick={scrollToForm}
            style={{ paddingLeft: "24px", paddingRight: "24px" }}
          >
            Investigate Message
          </Button>
        </section>

        {/* SECTION 2 & 3: INPUT / AI INVESTIGATION LOADER / ERROR STATES */}
        <div ref={formRef}>
          <AnimatePresence mode="wait">
            {viewState === "loading" && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
              >
                <AgentLoader
                  title="Investigating Investment Tip with AI Security Models..."
                  steps={INVESTIGATION_STAGES}
                  step={loaderStep}
                />
              </motion.div>
            )}

            {viewState === "error" && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
              >
                <ErrorState
                  title="Scam Investigation Encountered an Error"
                  description={errorDetails?.message}
                  code={errorDetails?.code}
                  requestId={errorDetails?.requestId}
                  onRetry={handleRetry}
                  actionLabel="Retry Investigation"
                />
              </motion.div>
            )}

            {(viewState === "input" || viewState === "results") && (
              <motion.div
                key="input-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <ScamInputForm onAnalyze={handleAnalyze} loading={viewState === "loading"} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* SECTION 4 - 8: RISK DASHBOARD & INVESTIGATION RESULTS */}
        {viewState === "results" && scamData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{ marginTop: "32px" }}
          >
            {/* Header divider */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                paddingBottom: "12px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div>
                <Badge variant="danger" size="sm" style={{ marginBottom: "6px" }}>
                  SECURITY AUDIT COMPLETE
                </Badge>
                <h2 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                  Scam Risk Analysis Report
                </h2>
              </div>

              <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => setViewState("input")}>
                New Investigation
              </Button>
            </div>

            {/* SECTION 4: RISK DASHBOARD GAUGE */}
            <ScamGauge
              riskScore={scamData.risk_score}
              classification={scamData.classification}
              confidence={scamData.confidence}
              availableModels={scamData.available_models}
              latencyMs={latencyMs}
              isMobile={isMobile}
            />

            {/* SECTION 5: EVIDENCE CHIPS */}
            <EvidenceChips evidence={scamData.evidence} />

            {/* SECTION 6: AI EXPLANATION CONVERSATION CARD */}
            <AIExplanationCard explanation={scamData.explanation} />

            {/* SECTION 7: VERTICAL INVESTIGATION TIMELINE */}
            <InvestigationTimeline availableModels={scamData.available_models} />

            {/* SECTION 8: RECOMMENDED ACTIONS */}
            <RecommendedActions riskScore={scamData.risk_score} />
          </motion.div>
        )}

        {/* EMPTY STATE FALLBACK */}
        {viewState === "input" && !lastSubmittedPayload && (
          <EmptyState
            title="Ready to Investigate Investment Tips"
            description="Paste any suspicious WhatsApp tip, Telegram channel signal, SMS, or Email above to run multi-agent AI scam detection."
            icon={MessageSquare}
          />
        )}
      </div>
    </PageTransition>
  );
}

export default ScamDetectorPage;
