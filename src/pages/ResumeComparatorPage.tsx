import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import PixelNavbar from "@/components/layout/PixelNavbar";
import { PixelBackground } from "@/components/ui/PixelBackground";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Swords, Loader2, CheckCircle2, AlertCircle, FileText, Upload } from "lucide-react";
import { compareResumeWithJD } from "@/lib/ai";
import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface ComparisonResult {
  score: number;
  missingSkills: string[];
  strengths: string[];
  improvements: string[];
  verdict: string;
  detailedAnalysis?: string;
}

interface UserProfile {
  bio?: string;
  achievements?: string[];
  skills?: string[];
  currentRole?: string;
  interviewAnswers?: { question: string; answer: string }[];
}

const ResumeComparatorPage = () => {
  const navigate = useNavigate();
  const [resumeText, setResumeText] = useState("");
  const [targetResumeText, setTargetResumeText] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isReadingPdf, setIsReadingPdf] = useState(false);
  const [isReadingTargetPdf, setIsReadingTargetPdf] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [userContext, setUserContext] = useState("");
  const [activeTab, setActiveTab] = useState<"text" | "pdf">("text");
  const [activeTabTarget, setActiveTabTarget] = useState<"text" | "pdf">("text");

  useEffect(() => {
    const fetchUserContext = async () => {
       const user = auth.currentUser;
       if (user) {
         try {
           const docRef = doc(db, "users", user.uid);
           const snapshot = await getDoc(docRef);
           if (snapshot.exists()) {
              const data = snapshot.data() as UserProfile;
              const context = `
              Bio: ${data.bio || "N/A"}
              Achievements: ${data.achievements?.join(", ") || "N/A"}
              Skills: ${data.skills?.join(", ") || "N/A"}
              Current Role: ${data.currentRole || "N/A"}
              Interview Answers: ${data.interviewAnswers?.map((a) => `Q: ${a.question} A: ${a.answer}`).join("; ") || "N/A"}
              `;
              setUserContext(context);
           }
         } catch (error) {
           console.error("Error fetching user context:", error);
         }
       }
    };
    fetchUserContext();
  }, []);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a valid PDF file.");
      return;
    }

    setResumeText("");
    setResult(null);
    setIsReadingPdf(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => (item as { str: string }).str).join(" ");
        fullText += pageText + "\n";
      }

      if (!fullText.trim()) throw new Error("No selectable text found. Use a text PDF or paste the resume text.");
      setResumeText(fullText.trim());
      toast.success("PDF loaded successfully!");
    } catch (error) {
      console.error("Error reading PDF:", error);
      toast.error(error instanceof Error ? error.message : "Failed to read PDF. Please paste the text instead.");
    } finally {
      setIsReadingPdf(false);
    }
  };

  const handleTargetPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a valid PDF file.");
      return;
    }

    setTargetResumeText("");
    setResult(null);
    setIsReadingTargetPdf(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => (item as { str: string }).str).join(" ");
        fullText += pageText + "\n";
      }

      if (!fullText.trim()) throw new Error("No selectable text found. Use a text PDF or paste the resume text.");
      setTargetResumeText(fullText.trim());
      toast.success("Target PDF loaded successfully!");
    } catch (error) {
      console.error("Error reading PDF:", error);
      toast.error(error instanceof Error ? error.message : "Failed to read PDF. Please paste the text instead.");
    } finally {
      setIsReadingTargetPdf(false);
    }
  };

  const handleCompare = async () => {
    if (isAnalyzing || isReadingPdf || isReadingTargetPdf) return;
    if (!resumeText.trim() || !targetResumeText.trim()) {
      toast.error("Provide a journalist profile and a reporting brief.");
      return;
    }

    setIsAnalyzing(true);
    try {
      const analysis = await compareResumeWithJD(resumeText, targetResumeText, userContext, customPrompt);
      setResult(analysis);

      const user = auth.currentUser;
      if (user) {
        const comparisonRecord = {
          id: Date.now().toString(),
          date: new Date(),
          role: "Target Role", 
          company: "Target Company", 
          score: analysis.score,
          missingSkills: analysis.missingSkills,
          feedback: analysis.verdict
        };

        const updates: any = {
          comparisons: arrayUnion(comparisonRecord)
        };

        if (customPrompt.trim()) {
           updates.aspirations = arrayUnion(customPrompt.trim());
        }

        await updateDoc(doc(db, "users", user.uid), updates);
        toast.success("Analysis saved to your profile!");
      } else {
        toast.info("Login to save your analysis history.");
      }

    } catch (error: unknown) {
      console.error("Comparison failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Please check your API key and connection.";
      toast.error("Analysis Failed", {
        description: errorMessage
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background font-sans overflow-x-hidden">
      
      <PixelNavbar />

      <main className="relative z-10 pt-32 pb-20 px-6 container mx-auto max-w-5xl">
        <div className="text-center mb-12">
           <h1 className="text-4xl md:text-6xl font-black font-display uppercase leading-tight mb-4 drop-shadow-sm">
             Journalist <span className="text-primary">profile review</span>
           </h1>
           <p className="text-xl text-muted-foreground font-medium">
             Compare a journalist portfolio with a reporting brief. Review the evidence and plan the next steps.
           </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col">
            <h2 className="text-xl font-bold font-display uppercase mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-blue-100 border-2 border-black flex items-center justify-center text-blue-600 rounded">1</span>
              Journalist profile
            </h2>
            
            <div className="flex gap-2 mb-4">
               <Button 
                  size="sm"
                  variant={activeTab === "text" ? "default" : "outline"} 
                  onClick={() => setActiveTab("text")}
                  className={activeTab === "text" ? "bg-black text-white" : ""}
                >
                  <FileText className="w-4 h-4 mr-2" /> Paste Text
               </Button>
               <Button 
                  size="sm"
                  variant={activeTab === "pdf" ? "default" : "outline"} 
                  onClick={() => setActiveTab("pdf")}
                  className={activeTab === "pdf" ? "bg-black text-white" : ""}
                >
                  <Upload className="w-4 h-4 mr-2" /> Upload PDF
               </Button>
            </div>

            {activeTab === "text" ? (
              <Textarea 
                placeholder="Paste a journalist portfolio, bylines and reporting experience..."
                className="flex-grow min-h-[300px] border-2 border-black resize-none text-base p-4 focus-visible:ring-0"
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
              />
            ) : (
              <div className="flex-grow min-h-[300px] border-2 border-black border-dashed flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
                 {isReadingPdf ? (
                    <div className="flex flex-col items-center">
                       <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                       <p className="font-bold">Reading PDF...</p>
                    </div>
                 ) : (
                    <>
                       <Upload className="w-12 h-12 text-gray-400 mb-4" />
                       <p className="font-bold text-lg mb-2">Upload journalist profile PDF</p>
                       <p className="text-sm text-muted-foreground mb-4">We will extract the text automatically.</p>
                       <input 
                          type="file" 
                          accept=".pdf" 
                          onChange={handlePdfUpload}
                          className="block w-full text-sm text-slate-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-full file:border-0
                            file:text-sm file:font-semibold
                            file:bg-blue-50 file:text-blue-700
                            hover:file:bg-blue-100
                          "
                        />
                        {resumeText && (
                           <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm flex items-center">
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Profile loaded! ({resumeText.length} chars)
                           </div>
                        )}
                    </>
                 )}
              </div>
            )}
          </div>

          <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col">
            <h2 className="text-xl font-bold font-display uppercase mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-red-100 border-2 border-black flex items-center justify-center text-red-600 rounded">2</span>
              Beat requirements / reference profile
            </h2>

            <div className="flex gap-2 mb-4">
               <Button 
                  size="sm"
                  variant={activeTabTarget === "text" ? "default" : "outline"} 
                  onClick={() => setActiveTabTarget("text")}
                  className={activeTabTarget === "text" ? "bg-black text-white" : ""}
                >
                  <FileText className="w-4 h-4 mr-2" /> Paste Text
               </Button>
               <Button 
                  size="sm"
                  variant={activeTabTarget === "pdf" ? "default" : "outline"} 
                  onClick={() => setActiveTabTarget("pdf")}
                  className={activeTabTarget === "pdf" ? "bg-black text-white" : ""}
                >
                  <Upload className="w-4 h-4 mr-2" /> Upload PDF
               </Button>
            </div>

            {activeTabTarget === "text" ? (
              <Textarea 
                placeholder="Describe the reporting beat, evidence standards and required skills..."
                className="flex-grow min-h-[200px] border-2 border-black resize-none text-base p-4 focus-visible:ring-0 mb-4"
                value={targetResumeText}
                onChange={(e) => setTargetResumeText(e.target.value)}
              />
            ) : (
              <div className="flex-grow min-h-[200px] border-2 border-black border-dashed flex flex-col items-center justify-center bg-gray-50 p-6 text-center mb-4">
                 {isReadingTargetPdf ? (
                    <div className="flex flex-col items-center">
                       <Loader2 className="w-8 h-8 animate-spin text-red-600 mb-2" />
                       <p className="font-bold">Reading Target PDF...</p>
                    </div>
                 ) : (
                    <>
                       <Upload className="w-12 h-12 text-gray-400 mb-4" />
                       <p className="font-bold text-lg mb-2">Upload reference PDF</p>
                       <p className="text-sm text-muted-foreground mb-4">We will extract the text automatically.</p>
                       <input 
                          type="file" 
                          accept=".pdf" 
                          onChange={handleTargetPdfUpload}
                          className="block w-full text-sm text-slate-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-full file:border-0
                            file:text-sm file:font-semibold
                            file:bg-red-50 file:text-red-700
                            hover:file:bg-red-100
                          "
                        />
                        {targetResumeText && (
                           <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm flex items-center">
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Target loaded! ({targetResumeText.length} chars)
                           </div>
                        )}
                    </>
                 )}
              </div>
            )}
            
            <div className="mt-auto">
               <h3 className="text-sm font-bold uppercase text-muted-foreground mb-2">Special Instructions (Optional)</h3>
               <Textarea 
                  placeholder="E.g., 'Focus on my leadership skills' or 'Ignore the degree requirement'..."
                  className="min-h-[80px] border-2 border-black resize-none text-sm p-3 focus-visible:ring-0"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
               />
            </div>
          </div>
        </div>

        <div className="text-center mb-16">
          <Button 
            onClick={handleCompare} 
            disabled={isAnalyzing || isReadingPdf || isReadingTargetPdf}
            className="h-16 px-10 text-xl font-black uppercase tracking-widest border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all bg-yellow-400 text-black hover:bg-yellow-500"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-3 h-6 w-6 animate-spin" /> Analyzing...
              </>
            ) : (
              <>
                <Swords className="mr-3 h-6 w-6" /> Review profile
              </>
            )}
          </Button>
        </div>

        {result && <section className="bg-white border rounded-xl p-8 mt-10" aria-label="Editorial review result"><div className="flex justify-between items-center border-b pb-5 mb-6"><h2 className="font-semibold text-2xl">Editorial profile review</h2><span className="text-xs text-slate-500">AI-assisted · Review required</span></div><div className="grid md:grid-cols-[220px_1fr] gap-8"><aside className="rounded-xl bg-blue-50 p-6 self-start"><p className="text-sm text-slate-600">Brief coverage estimate</p><p className="text-5xl font-semibold text-primary my-4">{result.score}<span className="text-base text-slate-500"> / 100</span></p><p className="text-xs text-slate-600 leading-relaxed">A model-generated comparison of the supplied documents. This is not a verified quality rating or hiring recommendation.</p></aside><div className="space-y-6"><p className="text-sm leading-relaxed text-slate-700">{result.verdict}</p><section><h3 className="font-semibold mb-3">Evidence and reporting requirements</h3><p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{result.detailedAnalysis}</p></section><div className="grid md:grid-cols-2 gap-5"><section><h3 className="font-semibold mb-3">Capabilities to develop</h3><ul className="space-y-2 text-sm text-slate-600">{result.missingSkills.map(t=><li key={t}>• {t}</li>)}</ul></section><section><h3 className="font-semibold mb-3">Suggested next steps</h3><ul className="space-y-2 text-sm text-slate-600">{result.improvements.map(t=><li key={t}>• {t}</li>)}</ul></section></div></div></div></section>}
      </main>
    </div>
  );
};

export default ResumeComparatorPage;
