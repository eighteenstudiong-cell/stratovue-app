import { useState, useEffect } from "react";import '@fontsource/montserrat/700.css';
import '@fontsource/montserrat/400.css';
import { fetchPosts, fetchCourses } from './sheetsService';

const BRAND = "#3C3489";
const DARK = "#0D0B2B";
const OFF_WHITE = "#F5F4F0";
const MID = "#888780";
const NEAR_BLACK = "#1A1A1A";

const ADVISORY_COLOR = "#534AB7";
const TRAINING_COLOR = "#1D9E75";
const STUDIO_COLOR = "#D85A30";
const CLEARVIEW_COLOR = "#378ADD";

const WordMark = ({ dark = false }) => (
  <div>
    <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:18,letterSpacing:"0.18em",color: dark ? "white" : NEAR_BLACK,lineHeight:1}}>STRATOVUE</div>
    <div style={{height:"0.5px",background: dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)",margin:"5px 0"}}></div>
    <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:7.5,letterSpacing:"0.3em",color: dark ? "rgba(255,255,255,0.38)" : MID}}>THE COMPANY</div>
  </div>
);

const Nav = ({ page, setPage, platform, setPlatform }) => {
  const navItems = ["Home","About","Advisory","Training","Studio","Clearview","Thinking","Contact"];

  return (
    <nav style={{
      position:"fixed",top:0,left:0,right:0,zIndex:100,
      background:"rgba(255,255,255,0.96)",
      borderBottom:`0.5px solid rgba(0,0,0,0.08)`,
      backdropFilter:"blur(12px)",
      WebkitBackdropFilter:"blur(12px)"
    }}>
      <div style={{maxWidth:1200,margin:"0 auto",padding:"0 32px",display:"flex",alignItems:"center",justifyContent:"space-between",height:68}}>
        <div style={{cursor:"pointer"}} onClick={()=>{setPage("Home");setPlatform(false);}}>
          <WordMark dark={false}/>
        </div>

        <div style={{display:"flex",alignItems:"center",gap:4}}>
          {navItems.map(n => (
            <button key={n} onClick={()=>{setPage(n);setPlatform(false);}} style={{
              background:"none",border:"none",cursor:"pointer",
              fontFamily:"'Montserrat',sans-serif",fontWeight:600,fontSize:11,
              letterSpacing:"0.1em",
              color: page===n ? BRAND : MID,
              padding:"8px 10px",
              borderBottom: page===n ? `2px solid ${BRAND}` : "2px solid transparent",
              transition:"all 0.2s"
            }}>{n.toUpperCase()}</button>
          ))}
          <button onClick={()=>{setPage("Clearview");setPlatform(true);}} style={{
            marginLeft:8,
            background:BRAND,color:"white",border:"none",cursor:"pointer",
            fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:10,
            letterSpacing:"0.12em",padding:"10px 18px",borderRadius:8,
            transition:"all 0.2s"
          }}>ENTER CLEARVIEW</button>
        </div>
      </div>
    </nav>
  );
};

const Hero = ({ setPage }) => (
  <section style={{minHeight:"100vh",display:"flex",alignItems:"center",background:OFF_WHITE,paddingTop:68}}>
    <div style={{maxWidth:1200,margin:"0 auto",padding:"80px 32px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:80,alignItems:"center"}}>
      <div>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:32}}>
          <div style={{width:32,height:0.5,background:BRAND}}></div>
          <span style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:10,letterSpacing:"0.2em",color:BRAND}}>STRATEGIC INTELLIGENCE</span>
        </div>
        <h1 style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:56,lineHeight:1.05,color:NEAR_BLACK,margin:"0 0 24px"}}>
          Most leaders don't have a strategy problem.
        </h1>
        <p style={{fontFamily:"Georgia,serif",fontSize:20,lineHeight:1.7,color:"#444441",margin:"0 0 40px",maxWidth:480}}>
          They have a clarity problem. The Stratovue Company helps founders and executives see what is actually true, decide from that truth, and build systems that hold.
        </p>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <button onClick={()=>setPage("Advisory")} style={{
            background:BRAND,color:"white",border:"none",cursor:"pointer",
            fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:11,
            letterSpacing:"0.12em",padding:"16px 28px",borderRadius:10,transition:"all 0.2s"
          }}>START WITH A CLARITY CONVERSATION</button>
          <button onClick={()=>setPage("About")} style={{
            background:"none",color:BRAND,border:`1.5px solid ${BRAND}`,cursor:"pointer",
            fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:11,
            letterSpacing:"0.12em",padding:"15px 24px",borderRadius:10,transition:"all 0.2s"
          }}>OUR STORY</button>
        </div>
        <div style={{marginTop:48,display:"flex",gap:32}}>
          {[["See","Clarity first"],["Strategize","Direction second"],["Systematize","Structure third"]].map(([w,d])=>(
            <div key={w}>
              <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:13,color:NEAR_BLACK,letterSpacing:"0.06em"}}>{w}</div>
              <div style={{fontFamily:"Georgia,serif",fontSize:12,color:MID,marginTop:2}}>{d}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{display:"flex",justifyContent:"center",alignItems:"center"}}>
        <div style={{position:"relative"}}>
          <div style={{width:400,height:400,borderRadius:40,background:BRAND,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8}}>
            <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:72,letterSpacing:"0.08em",color:"white",lineHeight:1}}>STRAT</div>
            <div style={{width:200,height:1,background:"rgba(255,255,255,0.3)"}}></div>
            <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:72,letterSpacing:"0.08em",color:"rgba(255,255,255,0.5)",lineHeight:1}}>OVUE</div>
          </div>
          <div style={{position:"absolute",bottom:-20,right:-20,background:"white",borderRadius:16,padding:"16px 20px",boxShadow:"0 8px 32px rgba(60,52,137,0.15)"}}>
            <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:11,color:BRAND,letterSpacing:"0.1em"}}>A CLARITY COMPANY</div>
            <div style={{fontFamily:"Georgia,serif",fontSize:12,color:MID,marginTop:4}}>Converting confusion into direction</div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const PracticesSection = ({ setPage }) => {
  const practices = [
    { name:"Advisory", color:ADVISORY_COLOR, desc:"Strategy consulting, leadership advisory, and growth architecture for founders and executives navigating high-stakes decisions.", cta:"Advisory" },
    { name:"Training", color:TRAINING_COLOR, desc:"Structured programs, certification tracks, and courses that build strategic thinking and leadership capacity.", cta:"Training" },
    { name:"Studio", color:STUDIO_COLOR, desc:"Brand intelligence, positioning, and market influence for organizations that need to be seen clearly and chosen consistently.", cta:"Studio" },
    { name:"Clearview", color:CLEARVIEW_COLOR, desc:"A tool, a community, and a curriculum delivered at scale. The platform where leaders come to grow in clarity.", cta:"Clearview" },
  ];
  return (
    <section style={{padding:"100px 32px",background:"white"}}>
      <div style={{maxWidth:1200,margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
          <div style={{width:32,height:0.5,background:BRAND}}></div>
          <span style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:10,letterSpacing:"0.2em",color:BRAND}}>COMPANY PRACTICES</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:8}}>
          <h2 style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:38,color:NEAR_BLACK,margin:0,lineHeight:1.1}}>Four practices. One company.</h2>
          <p style={{fontFamily:"Georgia,serif",fontSize:17,color:"#444441",lineHeight:1.7,margin:0}}>Each practice compounds the next. Advisory builds the thinking. Training makes it teachable. Studio makes it visible. Clearview makes it scale.</p>
        </div>
        <div style={{height:0.5,background:"rgba(0,0,0,0.08)",marginBottom:48}}></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>
          {practices.map((p,i)=>(
            <div key={p.name} style={{borderTop:`3px solid ${p.color}`,paddingTop:24,cursor:"pointer"}} onClick={()=>setPage(p.cta)}>
              <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:10,letterSpacing:"0.14em",color:p.color,marginBottom:8}}>0{i+1}</div>
              <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:18,color:NEAR_BLACK,marginBottom:12}}>{p.name}</div>
              <p style={{fontFamily:"Georgia,serif",fontSize:14,color:"#5F5E5A",lineHeight:1.7,margin:"0 0 20px"}}>{p.desc}</p>
              <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:10,letterSpacing:"0.1em",color:p.color}}>LEARN MORE →</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const VisionSection = () => (
  <section style={{padding:"100px 32px",background:DARK}}>
    <div style={{maxWidth:1200,margin:"0 auto",display:"grid",gridTemplateColumns:"1fr 1fr",gap:80,alignItems:"center"}}>
      <div>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:24}}>
          <div style={{width:32,height:0.5,background:"rgba(255,255,255,0.3)"}}></div>
          <span style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:10,letterSpacing:"0.2em",color:"rgba(255,255,255,0.4)"}}>OUR VISION</span>
        </div>
        <h2 style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:38,color:"white",lineHeight:1.15,margin:"0 0 24px"}}>
          A world where the organizations that shape society are led by people who see clearly.
        </h2>
        <p style={{fontFamily:"Georgia,serif",fontSize:17,color:"rgba(255,255,255,0.6)",lineHeight:1.75,margin:0}}>
          The Stratovue Company exists to produce that kind of leader. One who thinks with precision, builds with intention, and leads in a way that changes the room, the organization, and the generation they are responsible for.
        </p>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:0}}>
        {[["The Room","Clarity changes immediate surroundings first."],["The Organization","Then reshapes how the whole structure thinks."],["The Generation","And leaves a legacy that outlasts the leader."]].map(([t,d],i)=>(
          <div key={t} style={{padding:"28px 0",borderBottom:i<2?"0.5px solid rgba(255,255,255,0.1)":"none"}}>
            <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:10,letterSpacing:"0.14em",color:"rgba(255,255,255,0.35)",marginBottom:8}}>0{i+1}</div>
            <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:20,color:"white",marginBottom:8}}>{t}</div>
            <div style={{fontFamily:"Georgia,serif",fontSize:15,color:"rgba(255,255,255,0.55)",lineHeight:1.65}}>{d}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const CTASection = ({ setPage }) => (
  <section style={{padding:"100px 32px",background:OFF_WHITE}}>
    <div style={{maxWidth:800,margin:"0 auto",textAlign:"center"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:24}}>
        <div style={{width:32,height:0.5,background:BRAND}}></div>
        <span style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:10,letterSpacing:"0.2em",color:BRAND}}>START HERE</span>
        <div style={{width:32,height:0.5,background:BRAND}}></div>
      </div>
      <h2 style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:42,color:NEAR_BLACK,lineHeight:1.1,margin:"0 0 20px"}}>
        If you are at the edge of your next decision
      </h2>
      <p style={{fontFamily:"Georgia,serif",fontSize:18,color:"#444441",lineHeight:1.75,margin:"0 0 40px"}}>
        Start with a clarity conversation. One session. No obligation. Just honest thinking together about what is true and what is next.
      </p>
      <button onClick={()=>setPage("Contact")} style={{
        background:BRAND,color:"white",border:"none",cursor:"pointer",
        fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:12,
        letterSpacing:"0.12em",padding:"18px 36px",borderRadius:10,
      }}>BOOK A CLARITY CONVERSATION</button>
    </div>
  </section>
);

const PageHero = ({ label, title, subtitle, bg=OFF_WHITE, titleColor=NEAR_BLACK }) => (
  <section style={{paddingTop:140,paddingBottom:80,paddingLeft:32,paddingRight:32,background:bg}}>
    <div style={{maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
        <div style={{width:32,height:0.5,background: bg===DARK ? "rgba(255,255,255,0.3)" : BRAND}}></div>
        <span style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:10,letterSpacing:"0.2em",color: bg===DARK ? "rgba(255,255,255,0.4)" : BRAND}}>{label}</span>
      </div>
      <h1 style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:52,color:titleColor,lineHeight:1.05,margin:"0 0 20px",maxWidth:760}}>{title}</h1>
      {subtitle && <p style={{fontFamily:"Georgia,serif",fontSize:19,color: bg===DARK ? "rgba(255,255,255,0.6)" : "#444441",lineHeight:1.75,maxWidth:600,margin:0}}>{subtitle}</p>}
    </div>
  </section>
);

const AboutPage = () => (
  <div>
    <PageHero label="OUR STORY" title="Why The Stratovue Company Exists"
      subtitle="Most leaders are never asked to answer the why. Not the surface why. The real one." />
    <section style={{padding:"80px 32px",background:"white"}}>
      <div style={{maxWidth:1200,margin:"0 auto",display:"grid",gridTemplateColumns:"1fr 1fr",gap:80}}>
        <div>
          <p style={{fontFamily:"Georgia,serif",fontSize:17,color:"#444441",lineHeight:1.8,margin:"0 0 24px"}}>
            Why are you building what you are building? Why did you become what you became? Without that answer, everything else is motion without direction. A leader can be intelligent, driven, and resourceful, and still be building in the wrong direction.
          </p>
          <p style={{fontFamily:"Georgia,serif",fontSize:17,color:"#444441",lineHeight:1.8,margin:"0 0 24px"}}>
            That is not a strategy problem. That is a clarity problem. The Stratovue Company was born from watching that pattern repeat. Leaders in business and in ministry avoiding the hard questions, not because they lacked intelligence, but because no one held them accountable to answering them.
          </p>
          <p style={{fontFamily:"Georgia,serif",fontSize:17,color:"#444441",lineHeight:1.8,margin:0}}>
            The conviction behind this company is simple: when a leader sees clearly, everything around them changes. The room changes. The organization changes. The generation they are responsible for changes.
          </p>
        </div>
        <div>
          <div style={{background:OFF_WHITE,borderRadius:20,padding:40,marginBottom:24}}>
            <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:10,letterSpacing:"0.16em",color:BRAND,marginBottom:16}}>THE BRAND STATEMENT</div>
            <blockquote style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:22,color:NEAR_BLACK,lineHeight:1.4,margin:0,borderLeft:`3px solid ${BRAND}`,paddingLeft:20}}>
              "The Stratovue Company exists to convert confusion into clarity, and clarity into action."
            </blockquote>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {[["Vision","A world where organizations are led by people who see clearly."],["Mission","To produce leaders who think with precision and build with intention."],["Method","Clarity first. Strategy second. Structure third."],["Values","Truth over comfort. Counsel over content. Systems over hustle."]].map(([t,d])=>(
              <div key={t} style={{background:OFF_WHITE,borderRadius:12,padding:20}}>
                <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:10,letterSpacing:"0.12em",color:BRAND,marginBottom:8}}>{t}</div>
                <div style={{fontFamily:"Georgia,serif",fontSize:13,color:"#444441",lineHeight:1.65}}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  </div>
);

const PracticePage = ({ name, color, label, heroTitle, heroSub, services, model, bg=OFF_WHITE }) => (
  <div>
    <PageHero label={label} title={heroTitle} subtitle={heroSub} bg={bg} titleColor={bg===DARK ? "white" : NEAR_BLACK}/>
    <section style={{padding:"80px 32px",background:"white"}}>
      <div style={{maxWidth:1200,margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:40}}>
          <div style={{width:32,height:0.5,background:color}}></div>
          <span style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:10,letterSpacing:"0.2em",color}}>SERVICES</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:64}}>
          {services.map(s=>(
            <div key={s.title} style={{borderTop:`2px solid ${color}`,paddingTop:20}}>
              <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:15,color:NEAR_BLACK,marginBottom:10}}>{s.title}</div>
              <p style={{fontFamily:"Georgia,serif",fontSize:14,color:"#5F5E5A",lineHeight:1.7,margin:0}}>{s.desc}</p>
            </div>
          ))}
        </div>
        {model && (
          <>
            <div style={{height:0.5,background:"rgba(0,0,0,0.08)",marginBottom:48}}></div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:32}}>
              <div style={{width:32,height:0.5,background:color}}></div>
              <span style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:10,letterSpacing:"0.2em",color}}>ENGAGEMENT MODEL</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
              {model.map(m=>(
                <div key={m.title} style={{background:OFF_WHITE,borderRadius:12,padding:24}}>
                  <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:12,color,letterSpacing:"0.1em",marginBottom:10}}>{m.title}</div>
                  <p style={{fontFamily:"Georgia,serif",fontSize:14,color:"#444441",lineHeight:1.7,margin:0}}>{m.desc}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  </div>
);

const ClearviewLanding = ({ setPlatform }) => (
  <div>
    <PageHero label="STRATOVUE CLEARVIEW" title="The platform where leaders grow in clarity."
      subtitle="A tool, a community, and a curriculum delivered at scale."
      bg={DARK} titleColor="white"/>
    <section style={{padding:"80px 32px",background:"white"}}>
      <div style={{maxWidth:1200,margin:"0 auto"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:64}}>
          {[["Tools","Strategic frameworks, clarity assessments, and decision tools built on the Stratovue methodology.",CLEARVIEW_COLOR],
            ["Community","A curated community of leaders committed to growing in clarity. Access thinking, peers, and counsel.",CLEARVIEW_COLOR],
            ["Curriculum","A growing library of courses, programs, and certifications. Learn at your pace. Build at your level.",CLEARVIEW_COLOR]].map(([t,d,c])=>(
            <div key={t} style={{borderTop:`2px solid ${c}`,paddingTop:20}}>
              <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:16,color:NEAR_BLACK,marginBottom:10}}>{t}</div>
              <p style={{fontFamily:"Georgia,serif",fontSize:14,color:"#5F5E5A",lineHeight:1.7,margin:0}}>{d}</p>
            </div>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div style={{background:OFF_WHITE,borderRadius:16,padding:40}}>
            <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:10,letterSpacing:"0.14em",color:CLEARVIEW_COLOR,marginBottom:12}}>FREE TIER</div>
            <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:28,color:NEAR_BLACK,marginBottom:16}}>Start for free</div>
            <p style={{fontFamily:"Georgia,serif",fontSize:15,color:"#444441",lineHeight:1.7,margin:"0 0 24px"}}>Access foundational content, join the community, and begin your clarity journey at no cost.</p>
            <button onClick={()=>setPlatform(true)} style={{background:CLEARVIEW_COLOR,color:"white",border:"none",cursor:"pointer",fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:11,letterSpacing:"0.1em",padding:"14px 24px",borderRadius:8}}>JOIN FREE</button>
          </div>
          <div style={{background:BRAND,borderRadius:16,padding:40}}>
            <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:10,letterSpacing:"0.14em",color:"rgba(255,255,255,0.5)",marginBottom:12}}>PREMIUM</div>
            <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:28,color:"white",marginBottom:16}}>Full access</div>
            <p style={{fontFamily:"Georgia,serif",fontSize:15,color:"rgba(255,255,255,0.7)",lineHeight:1.7,margin:"0 0 24px"}}>Unlock the complete curriculum, all tools, premium community access, and monthly live sessions.</p>
            <button onClick={()=>setPlatform(true)} style={{background:"white",color:BRAND,border:"none",cursor:"pointer",fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:11,letterSpacing:"0.1em",padding:"14px 24px",borderRadius:8}}>GET FULL ACCESS</button>
          </div>
        </div>
      </div>
    </section>
  </div>
);

const ClearviewPlatform = ({ setPage, setPlatform }) => {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const tabs = ["Dashboard","Courses","Community","Tools","Library"];
  const courses = [
    {title:"The Clarity Framework",progress:65,tag:"Foundations",color:CLEARVIEW_COLOR},
    {title:"Answering the Why",progress:100,tag:"Identity",color:ADVISORY_COLOR},
    {title:"Strategic Architecture",progress:20,tag:"Systems",color:TRAINING_COLOR},
    {title:"Brand Intelligence",progress:0,tag:"Studio",color:STUDIO_COLOR},
  ];

  return (
    <div style={{minHeight:"100vh",background:"#F8F7F5",paddingTop:68}}>
      <div style={{background:DARK,padding:"24px 32px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <div>
            <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:14,color:"white",letterSpacing:"0.1em"}}>STRATOVUE CLEARVIEW</div>
            <div style={{fontFamily:"Georgia,serif",fontSize:12,color:"rgba(255,255,255,0.45)",marginTop:2}}>Your clarity platform</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          {tabs.map(t=>(
            <button key={t} onClick={()=>setActiveTab(t)} style={{
              background: activeTab===t ? "rgba(255,255,255,0.12)" : "none",
              color: activeTab===t ? "white" : "rgba(255,255,255,0.45)",
              border:"none",cursor:"pointer",
              fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:10,
              letterSpacing:"0.1em",padding:"8px 14px",borderRadius:6,transition:"all 0.2s"
            }}>{t.toUpperCase()}</button>
          ))}
          <button onClick={()=>{setPage("Home");setPlatform(false);}} style={{
            marginLeft:8,background:"none",color:"rgba(255,255,255,0.4)",
            border:"none",cursor:"pointer",fontFamily:"'Montserrat',sans-serif",
            fontWeight:600,fontSize:10,letterSpacing:"0.1em",padding:"8px 12px"
          }}>EXIT ×</button>
        </div>
      </div>

      <div style={{maxWidth:1200,margin:"0 auto",padding:"40px 32px"}}>
        {activeTab==="Dashboard" && (
          <div>
            <div style={{marginBottom:32}}>
              <h2 style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:28,color:NEAR_BLACK,margin:"0 0 8px"}}>Good morning, Leader.</h2>
              <p style={{fontFamily:"Georgia,serif",fontSize:16,color:MID,margin:0}}>Here is where you are and where you are going.</p>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:32}}>
              {[["Courses","4 enrolled",CLEARVIEW_COLOR],["Completed","1 done",TRAINING_COLOR],["Community","248 members",ADVISORY_COLOR],["Streak","7 days",STUDIO_COLOR]].map(([l,v,c])=>(
                <div key={l} style={{background:"white",borderRadius:12,padding:20,borderTop:`3px solid ${c}`}}>
                  <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:9,letterSpacing:"0.14em",color:MID,marginBottom:8}}>{l}</div>
                  <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:22,color:NEAR_BLACK}}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:16}}>
              <div style={{background:"white",borderRadius:16,padding:28}}>
                <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:10,letterSpacing:"0.14em",color:MID,marginBottom:20}}>YOUR COURSES</div>
                {courses.map(c=>(
                  <div key={c.title} style={{marginBottom:20,paddingBottom:20,borderBottom:"0.5px solid rgba(0,0,0,0.06)"}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                      <div>
                        <span style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:9,letterSpacing:"0.1em",color:c.color,background:c.color+"18",padding:"3px 8px",borderRadius:4,marginRight:8}}>{c.tag}</span>
                        <span style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:14,color:NEAR_BLACK}}>{c.title}</span>
                      </div>
                      <span style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:12,color:c.progress===100?TRAINING_COLOR:MID}}>{c.progress}%</span>
                    </div>
                    <div style={{height:4,background:OFF_WHITE,borderRadius:2}}>
                      <div style={{height:4,width:`${c.progress}%`,background:c.color,borderRadius:2,transition:"width 0.5s"}}></div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div style={{background:BRAND,borderRadius:16,padding:24,flex:1}}>
                  <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:10,letterSpacing:"0.14em",color:"rgba(255,255,255,0.5)",marginBottom:12}}>THIS WEEK</div>
                  <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:16,color:"white",marginBottom:8}}>Live Session</div>
                  <div style={{fontFamily:"Georgia,serif",fontSize:13,color:"rgba(255,255,255,0.65)",lineHeight:1.6,marginBottom:16}}>Strategic Decision-Making Under Pressure with Adriel</div>
                  <button style={{background:"white",color:BRAND,border:"none",cursor:"pointer",fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:10,letterSpacing:"0.1em",padding:"10px 16px",borderRadius:8,width:"100%"}}>REGISTER</button>
                </div>
                <div style={{background:"white",borderRadius:16,padding:24}}>
                  <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:10,letterSpacing:"0.14em",color:MID,marginBottom:12}}>COMMUNITY</div>
                  {["What clarity question are you sitting with this week?","Share one decision you made from truth, not pressure."].map((q,i)=>(
                    <div key={i} style={{fontFamily:"Georgia,serif",fontSize:13,color:"#444441",lineHeight:1.6,padding:"10px 0",borderBottom:i===0?"0.5px solid rgba(0,0,0,0.06)":"none"}}>{q}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab!=="Dashboard" && (
          <div style={{textAlign:"center",padding:"80px 0"}}>
            <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:32,letterSpacing:"0.14em",color:BRAND,marginBottom:24}}>STRATOVUE</div>
            <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:18,color:NEAR_BLACK,marginBottom:12}}>{activeTab} coming soon</div>
            <div style={{fontFamily:"Georgia,serif",fontSize:15,color:MID}}>This section is being built. Check back shortly.</div>
          </div>
        )}
      </div>
    </div>
  );
};

const ThinkingPage = ({ posts, loading }) => {
  return (
    <div>
      <PageHero label="STRATOVUE THINKING" title="The point of view that drives the work."
        subtitle="Clarity, strategy, leadership, and the questions worth sitting with." />
      <section style={{padding:"60px 32px 100px",background:"white"}}>
        <div style={{maxWidth:1200,margin:"0 auto"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:24}}>
            {posts.map(p=>(
              <div key={p.title} style={{cursor:"pointer"}}>
                <div style={{height:4,background:p.color,borderRadius:"2px 2px 0 0"}}></div>
                <div style={{background:OFF_WHITE,padding:28,borderRadius:"0 0 12px 12px"}}>
                  <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:9,letterSpacing:"0.14em",color:p.color,marginBottom:12}}>{p.tag}</div>
                  <h3 style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:17,color:NEAR_BLACK,lineHeight:1.3,margin:"0 0 12px"}}>{p.title}</h3>
                  <p style={{fontFamily:"Georgia,serif",fontSize:14,color:"#5F5E5A",lineHeight:1.7,margin:"0 0 20px"}}>{p.excerpt}</p>
                  <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:10,letterSpacing:"0.1em",color:p.color}}>READ →</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

const ContactPage = () => {
  const [form, setForm] = useState({name:"",email:"",org:"",message:""});
  const [sent, setSent] = useState(false);
  return (
    <div>
      <PageHero label="START HERE" title="A clarity conversation." subtitle="One session. No obligation. Just honest thinking together about what is true and what is next." />
      <section style={{padding:"80px 32px 120px",background:"white"}}>
        <div style={{maxWidth:900,margin:"0 auto",display:"grid",gridTemplateColumns:"1fr 1fr",gap:64}}>
          <div>
            <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:10,letterSpacing:"0.16em",color:BRAND,marginBottom:24}}>WHAT TO EXPECT</div>
            {[["01","We listen first.","You share what is true about your situation. No pitch. No agenda. Just an honest conversation."],
              ["02","We name what we see.","We will tell you what we observe clearly and honestly, even if it is uncomfortable."],
              ["03","We decide together.","Whether there is a fit for a deeper engagement becomes obvious by the end of the session."]].map(([n,t,d])=>(
              <div key={n} style={{display:"flex",gap:16,marginBottom:28}}>
                <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:10,color:BRAND,minWidth:20}}>{n}</div>
                <div>
                  <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:14,color:NEAR_BLACK,marginBottom:4}}>{t}</div>
                  <div style={{fontFamily:"Georgia,serif",fontSize:14,color:"#5F5E5A",lineHeight:1.65}}>{d}</div>
                </div>
              </div>
            ))}
          </div>
          {!sent ? (
            <div>
              <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:10,letterSpacing:"0.16em",color:BRAND,marginBottom:24}}>BOOK YOUR SESSION</div>
              {[["Your name","name","text"],["Email address","email","email"],["Organization","org","text"]].map(([label,field,type])=>(
                <div key={field} style={{marginBottom:16}}>
                  <label style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:10,letterSpacing:"0.1em",color:MID,display:"block",marginBottom:6}}>{label.toUpperCase()}</label>
                  <input type={type} value={form[field]} onChange={e=>setForm({...form,[field]:e.target.value})} style={{
                    width:"100%",padding:"12px 14px",border:`1px solid rgba(0,0,0,0.12)`,borderRadius:8,
                    fontFamily:"Georgia,serif",fontSize:15,color:NEAR_BLACK,outline:"none",background:"white",boxSizing:"border-box"
                  }}/>
                </div>
              ))}
              <div style={{marginBottom:24}}>
                <label style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:10,letterSpacing:"0.1em",color:MID,display:"block",marginBottom:6}}>WHAT BRINGS YOU HERE</label>
                <textarea value={form.message} onChange={e=>setForm({...form,message:e.target.value})} rows={4} style={{
                  width:"100%",padding:"12px 14px",border:`1px solid rgba(0,0,0,0.12)`,borderRadius:8,
                  fontFamily:"Georgia,serif",fontSize:15,color:NEAR_BLACK,outline:"none",background:"white",resize:"vertical",boxSizing:"border-box"
                }}/>
              </div>
              <button onClick={()=>setSent(true)} style={{
                background:BRAND,color:"white",border:"none",cursor:"pointer",width:"100%",
                fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:11,
                letterSpacing:"0.12em",padding:"16px",borderRadius:10,
              }}>SEND REQUEST</button>
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:"40px 0"}}>
              <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:28,letterSpacing:"0.16em",color:BRAND,marginBottom:8}}>STRATOVUE</div>
              <div style={{width:80,height:0.5,background:BRAND,marginBottom:24}}></div>
              <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:20,color:NEAR_BLACK,marginBottom:12}}>Request received.</div>
              <p style={{fontFamily:"Georgia,serif",fontSize:16,color:MID,lineHeight:1.7}}>We will be in touch within 24 hours to confirm your clarity conversation. In the meantime, take a look at our thinking.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

const Footer = ({ setPage }) => (
  <footer style={{background:DARK,padding:"64px 32px 40px"}}>
    <div style={{maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:48,marginBottom:64}}>
        <div>
          <div style={{marginBottom:20}}>
            <WordMark dark={true}/>
          </div>
          <p style={{fontFamily:"Georgia,serif",fontSize:14,color:"rgba(255,255,255,0.45)",lineHeight:1.75,maxWidth:280,margin:"0 0 20px"}}>Converting confusion into clarity, and clarity into action.</p>
          <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:11,color:"rgba(255,255,255,0.3)",letterSpacing:"0.12em"}}>SEE. STRATEGIZE. SYSTEMATIZE.</div>
        </div>
        {[
          {label:"Practices",links:["Advisory","Training","Studio","Clearview"]},
          {label:"Company",links:["About","Thinking","Contact"]},
          {label:"Platform",links:["Join Clearview","Free Access","Premium","Community"]},
        ].map(col=>(
          <div key={col.label}>
            <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:9,letterSpacing:"0.18em",color:"rgba(255,255,255,0.3)",marginBottom:20}}>{col.label}</div>
            {col.links.map(l=>(
              <div key={l} onClick={()=>setPage(l.replace("Join ","").replace(" Access","").replace("Premium","Clearview").replace("Community","Clearview"))}
                style={{fontFamily:"'Montserrat',sans-serif",fontWeight:600,fontSize:13,color:"rgba(255,255,255,0.55)",marginBottom:12,cursor:"pointer"}}>{l}</div>
            ))}
          </div>
        ))}
      </div>
      <div style={{height:0.5,background:"rgba(255,255,255,0.08)",marginBottom:24}}></div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontFamily:"Georgia,serif",fontSize:12,color:"rgba(255,255,255,0.25)"}}>© 2026 The Stratovue Company. All rights reserved.</div>
        <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:9,letterSpacing:"0.14em",color:"rgba(255,255,255,0.25)"}}>PORT HARCOURT, NIGERIA</div>
      </div>
    </div>
  </footer>
);

export default function StratovueApp() {
  const [posts, setPosts] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("Home");
  const [platform, setPlatform] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [p, c] = await Promise.all([fetchPosts(), fetchCourses()]);
        setPosts(p);
        setCourses(c);
      } catch (err) {
        console.error('Failed to load sheet data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(()=>{
    window.scrollTo(0,0);
  },[page]);

  const advisoryServices = [
    {title:"Strategy Consulting",desc:"Business strategy, positioning, and market direction for organizations that need clarity on where they are going and why."},
    {title:"Leadership Advisory",desc:"Coaching and decision support for founders and executives navigating high-stakes moments and complex leadership terrain."},
    {title:"Growth Architecture",desc:"Systems, structures, and scalable business models designed for organizations ready to build intelligently and grow with intention."},
  ];
  const advisoryModel = [
    {title:"RETAINER",desc:"Ongoing monthly engagement for founders and executives who need consistent access to strategic counsel as their organization evolves."},
    {title:"PROJECT-BASED",desc:"Defined scope and outcome. Suited for organizations at a specific inflection point. A repositioning, a reset, a growth architecture build."},
    {title:"PER SESSION",desc:"Access to strategic input at specific moments without a longer commitment. Single sessions around a defined question."},
  ];
  const trainingServices = [
    {title:"Programs",desc:"Cohort-based learning experiences that build strategic thinking and leadership capacity across teams and organizations."},
    {title:"Certifications",desc:"Structured certification tracks for leaders who want to carry the Stratovue methodology into their own organizations."},
    {title:"Courses",desc:"Individual courses available for self-paced learning, covering clarity, strategy, systems, and brand intelligence."},
  ];
  const studioServices = [
    {title:"Brand Positioning",desc:"Defining where your organization stands in the market, what makes it distinct, and what ground is worth defending."},
    {title:"Messaging Architecture",desc:"Building the language system that every communication from your organization runs through consistently."},
    {title:"Market Intelligence",desc:"Research, insight, and strategic clarity about your market, your audience, and where the opportunity actually lives."},
  ];

  if (platform || page==="Clearview_platform") {
    return (
      <>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource/montserrat@5.0.8/700.css"/>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource/montserrat@5.0.8/400.css"/>
        <Nav page={page} setPage={setPage} platform={platform} setPlatform={setPlatform}/>
        <ClearviewPlatform courses={courses} setPage={setPage} setPlatform={setPlatform}/>
      </>
    );
  }

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource/montserrat@5.0.8/700.css"/>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource/montserrat@5.0.8/400.css"/>
      <div style={{fontFamily:"Georgia,serif",background:"white",minHeight:"100vh"}}>
        <Nav page={page} setPage={setPage} platform={platform} setPlatform={setPlatform}/>
        <main>
          {page==="Home" && <>
            <Hero setPage={setPage}/>
            <PracticesSection setPage={setPage}/>
            <VisionSection/>
            <CTASection setPage={setPage}/>
          </>}
          {page==="About" && <AboutPage/>}
          {page==="Advisory" && <PracticePage name="Advisory" color={ADVISORY_COLOR} label="STRATOVUE ADVISORY"
            heroTitle="Strategy consulting and leadership counsel." bg={OFF_WHITE}
            heroSub="For founders and executives navigating high-stakes decisions."
            services={advisoryServices} model={advisoryModel}/>}
          {page==="Training" && <PracticePage name="Training" color={TRAINING_COLOR} label="STRATOVUE TRAINING"
            heroTitle="Programs, certifications, and courses." bg={OFF_WHITE}
            heroSub="Building strategic thinking and leadership capacity in individuals, teams, and organizations."
            services={trainingServices}/>}
          {page==="Studio" && <PracticePage name="Studio" color={STUDIO_COLOR} label="STRATOVUE STUDIO"
            heroTitle="Brand intelligence and market influence." bg={OFF_WHITE}
            heroSub="For organizations that need to be seen clearly, understood fully, and chosen consistently."
            services={studioServices}/>}
          {page==="Clearview" && <ClearviewLanding setPlatform={setPlatform}/>}
          {page==="Thinking" && <ThinkingPage posts={posts} loading={loading}/>}
          {page==="Contact" && <ContactPage/>}
        </main>
        {!platform && <Footer setPage={setPage}/>}
      </div>
    </>
  );
}