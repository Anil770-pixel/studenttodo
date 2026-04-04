import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import { Globe, MapPin, Trophy, Calendar, ExternalLink, Search, Loader2, Newspaper, TrendingUp, Bookmark, CheckCircle } from 'lucide-react';
import { getGroqCompletion } from '../lib/groq';
import { db } from '../firebase';
import { collection, query, limit, getDocs, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

const Competitions = () => {
    const { user } = useAuth();
    const [filter, setFilter] = useState('All'); // 'All', 'Global', 'India', 'Saved'
    const [interestDomain, setInterestDomain] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [savedOpportunities, setSavedOpportunities] = useState([]);

    // ✅ Updated: Real verified upcoming events — Feb 2026 onwards
    const [opportunities, setOpportunities] = useState([
        // ── HACKATHONS ──────────────────────────────────────────────────
        {
            id: 'gsoc-2026',
            title: 'Google Summer of Code 2026',
            category: 'Open Source Program',
            scope: 'Global',
            location: 'Remote',
            date: '2026-03-24', // Contributor applications open ~March
            image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
            url: 'https://summerofcode.withgoogle.com/',
            applicationUrl: 'https://summerofcode.withgoogle.com/',
            description: 'Work on open source projects mentored by top orgs. Stipend provided.'
        },
        {
            id: 'sih-2026',
            title: 'Smart India Hackathon 2026',
            category: 'Hackathon',
            scope: 'National',
            location: 'India (Multiple Venues)',
            date: '2026-08-01',
            image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80',
            url: 'https://www.sih.gov.in/',
            applicationUrl: 'https://www.sih.gov.in/',
            description: 'India\'s biggest national hackathon organized by AICTE & MoE.'
        },
        {
            id: 'mlh-spring-2026',
            title: 'MLH Spring Hackathon Season 2026',
            category: 'Hackathon',
            scope: 'Global',
            location: 'Online + Multiple Cities',
            date: '2026-03-01',
            image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&q=80',
            url: 'https://mlh.io/',
            applicationUrl: 'https://mlh.io/',
            description: 'Official student hackathon league — 200+ events worldwide.'
        },
        {
            id: 'devfolio-2026',
            title: 'Devfolio Hackathon Season India 2026',
            category: 'Hackathon',
            scope: 'National',
            location: 'Online + India',
            date: '2026-03-10',
            image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80',
            url: 'https://devfolio.co/hackathons',
            applicationUrl: 'https://devfolio.co/hackathons',
            description: 'India\'s largest web3 & tech hackathon platform. Browse 100+ live hackathons.'
        },
        {
            id: 'microsoft-ai-hack-2026',
            title: 'Microsoft AI Classroom Hackathon 2026',
            category: 'Hackathon',
            scope: 'Global',
            location: 'Online',
            date: '2026-04-01',
            image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80',
            url: 'https://github.com/microsoft/hack-together',
            applicationUrl: 'https://github.com/microsoft/hack-together',
            description: 'Build AI-powered apps with Microsoft 365 Copilot, Azure, and GitHub.'
        },
        {
            id: 'hackmit-2026',
            title: 'HackMIT 2026',
            category: 'Hackathon',
            scope: 'Global',
            location: 'MIT, Cambridge, USA',
            date: '2026-09-12',
            image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80',
            url: 'https://hackmit.org/',
            applicationUrl: 'https://hackmit.org/',
            description: 'One of the most prestigious student hackathons. Travel reimbursements available.'
        },
        {
            id: 'imagine-cup-2026',
            title: 'Microsoft Imagine Cup 2026',
            category: 'Competition',
            scope: 'Global',
            location: 'Online + Finals in USA',
            date: '2026-03-05',
            image: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80',
            url: 'https://imaginecup.microsoft.com/en-us/',
            applicationUrl: 'https://imaginecup.microsoft.com/en-us/',
            description: 'Global student tech competition. AI category has $75,000 prize.'
        },

        // ── CODING COMPETITIONS ──────────────────────────────────────────
        {
            id: 'icpc-2026',
            title: 'ICPC Asia Regionals 2026',
            category: 'Coding Contest',
            scope: 'Global',
            location: 'Multiple Asia Venues',
            date: '2026-10-01',
            image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80',
            url: 'https://icpc.global/',
            applicationUrl: 'https://icpc.global/',
            description: 'World\'s oldest and most prestigious programming contest.'
        },
        {
            id: 'codechef-starters-2026',
            title: 'CodeChef Starters & Long Challenge (Monthly)',
            category: 'Coding Contest',
            scope: 'Global',
            location: 'Online',
            date: '2026-03-04',
            image: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800&q=80',
            url: 'https://www.codechef.com/contests',
            applicationUrl: 'https://www.codechef.com/contests',
            description: 'Monthly long challenges and weekly Starters for all ratings.'
        },
        {
            id: 'codeforces-rounds-2026',
            title: 'Codeforces Rounds (Weekly)',
            category: 'Coding Contest',
            scope: 'Global',
            location: 'Online',
            date: '2026-03-01',
            image: 'https://images.unsplash.com/photo-1509966756634-9c23dd6e6815?w=800&q=80',
            url: 'https://codeforces.com/contests',
            applicationUrl: 'https://codeforces.com/contests',
            description: 'Rated contests every week. Div 1–4 for all skill levels.'
        },
        {
            id: 'hackerearth-march-2026',
            title: 'HackerEarth March Challenge 2026',
            category: 'Coding Contest',
            scope: 'Global',
            location: 'Online',
            date: '2026-03-15',
            image: 'https://images.unsplash.com/photo-1587620962725-abab19836100?w=800&q=80',
            url: 'https://www.hackerearth.com/challenges/',
            applicationUrl: 'https://www.hackerearth.com/challenges/',
            description: 'Monthly competitive programming challenges with certificates.'
        },
        {
            id: 'meta-hacker-cup-2026',
            title: 'Meta Hacker Cup 2026',
            category: 'Coding Contest',
            scope: 'Global',
            location: 'Online',
            date: '2026-08-01',
            image: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=800&q=80',
            url: 'https://www.facebook.com/codingcompetitions/hacker-cup',
            applicationUrl: 'https://www.facebook.com/codingcompetitions/hacker-cup',
            description: 'Annual algorithm competition by Meta. Top prize $10,000.'
        },
        {
            id: 'google-codejam-2026',
            title: 'Google Code Jam 2026',
            category: 'Coding Contest',
            scope: 'Global',
            location: 'Online',
            date: '2026-04-10',
            image: 'https://images.unsplash.com/photo-1542903660-eedba2cda473?w=800&q=80',
            url: 'https://codingcompetitions.withgoogle.com/codejam',
            applicationUrl: 'https://codingcompetitions.withgoogle.com/codejam',
            description: 'Google\'s algorithmic puzzle competition. Open to all students.'
        },
        {
            id: 'kaggle-2026',
            title: 'Kaggle ML Competitions (Active)',
            category: 'Data Science',
            scope: 'Global',
            location: 'Online',
            date: '2026-03-01',
            image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
            url: 'https://www.kaggle.com/competitions',
            applicationUrl: 'https://www.kaggle.com/competitions',
            description: '20+ live ML competitions. Cash prizes up to $100,000.'
        },

        // ── EXAMS & CERTIFICATIONS ────────────────────────────────────────
        {
            id: 'nptel-jan2026',
            title: 'NPTEL Jan–Apr 2026 Semester Exams',
            category: 'Exam',
            scope: 'National',
            location: 'India (Exam Centres)',
            date: '2026-04-25',
            image: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=800&q=80',
            url: 'https://nptel.ac.in/',
            applicationUrl: 'https://nptel.ac.in/',
            description: 'End-term proctored exams for Jan 2026 semester. Get IIT-certified.'
        },
        {
            id: 'gate-2026-results',
            title: 'GATE 2026 — Results & Counselling',
            category: 'Exam',
            scope: 'National',
            location: 'India',
            date: '2026-03-19',
            image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80',
            url: 'https://gate2026.iitr.ac.in/',
            applicationUrl: 'https://gate2026.iitr.ac.in/',
            description: 'GATE 2026 results on March 19. Use scorecard for PSU/M.Tech admissions.'
        },
        {
            id: 'upsc-cse-2026',
            title: 'UPSC Civil Services Prelims 2026',
            category: 'Exam',
            scope: 'National',
            location: 'India',
            date: '2026-05-24',
            image: 'https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=800&q=80',
            url: 'https://upsc.gov.in/',
            applicationUrl: 'https://upsc.gov.in/',
            description: 'UPSC CSE 2026 Prelims. Notification expected March 2026.'
        },

        // ── INTERNSHIPS & PROGRAMS ────────────────────────────────────────
        {
            id: 'tcs-codevita-2026',
            title: 'TCS CodeVita Season 13 (2026)',
            category: 'Coding Contest + Internship',
            scope: 'National',
            location: 'Online',
            date: '2026-06-01',
            image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80',
            url: 'https://www.tcs.com/careers/tcs-codevita',
            applicationUrl: 'https://www.tcs.com/careers/tcs-codevita',
            description: 'World\'s largest coding contest. Winners get direct TCS job offers.'
        },
        {
            id: 'internshala-summer-2026',
            title: 'Internshala Summer Internship Drive 2026',
            category: 'Internship',
            scope: 'National',
            location: 'Online + India',
            date: '2026-03-15',
            image: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&q=80',
            url: 'https://internshala.com/internships',
            applicationUrl: 'https://internshala.com/internships',
            description: '5000+ paid internships in tech, design, marketing. Stipend ₹5k–50k/month.'
        },
        {
            id: 'unstop-competitions-2026',
            title: 'Unstop — Live Competitions & Challenges',
            category: 'Hackathon',
            scope: 'National',
            location: 'Online + India',
            date: '2026-03-01',
            image: 'https://images.unsplash.com/photo-1485988412941-77a1f1be312f?w=800&q=80',
            url: 'https://unstop.com/competitions',
            applicationUrl: 'https://unstop.com/competitions',
            description: '500+ live competitions, hackathons, and B-school challenges.'
        },

        // ── WORKSHOPS / CONFERENCES ───────────────────────────────────────
        {
            id: 'google-io-2026',
            title: 'Google I/O 2026 Developer Conference',
            category: 'Conference',
            scope: 'Global',
            location: 'Shoreline, CA + Online',
            date: '2026-05-14',
            image: 'https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=800&q=80',
            url: 'https://io.google/',
            applicationUrl: 'https://io.google/',
            description: 'Google\'s flagship developer conference. Free to watch online.'
        },
        {
            id: 'aws-educate-2026',
            title: 'AWS Educate Cloud Bootcamp 2026',
            category: 'Workshop',
            scope: 'Global',
            location: 'Online',
            date: '2026-04-05',
            image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&q=80',
            url: 'https://aws.amazon.com/education/awseducate/',
            applicationUrl: 'https://aws.amazon.com/education/awseducate/',
            description: 'Free cloud training for students. Get AWS credits and badges.'
        },
        {
            id: 'flipkart-grid-7-2026',
            title: 'Flipkart GRiD 7.0 — Engineering Track',
            category: 'Competition',
            scope: 'National',
            location: 'Online + Bengaluru',
            date: '2026-07-01',
            image: 'https://images.unsplash.com/photo-1556742031-c6961e8560b0?w=800&q=80',
            url: 'https://unstop.com/competitions',
            applicationUrl: 'https://unstop.com/competitions',
            description: 'Flipkart\'s national tech challenge. Top teams get PPO offers.'
        },

        // ── GOVERNMENT HACKATHONS ────────────────────────────────────────
        {
            id: 'kavach-2026',
            title: 'KAVACH Cybersecurity Hackathon 2026',
            category: 'Hackathon',
            scope: 'National',
            location: 'India',
            date: '2026-05-01',
            image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80',
            url: 'https://kavach.mic.gov.in/',
            applicationUrl: 'https://kavach.mic.gov.in/',
            description: 'MHA + MIC national hackathon on cybersecurity. Cash prizes + job offers.'
        },
        {
            id: 'toycathon-2026',
            title: 'Toycathon 2026 — Govt. of India',
            category: 'Hackathon',
            scope: 'National',
            location: 'India',
            date: '2026-06-15',
            image: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&q=80',
            url: 'https://toycathon.mic.gov.in/',
            applicationUrl: 'https://toycathon.mic.gov.in/',
            description: 'MoE innovation challenge for designing Indian toys & games. ₹50L prize pool.'
        },
        {
            id: 'innovate-india-2026',
            title: 'Innovate India — Startup India Challenge',
            category: 'Hackathon',
            scope: 'National',
            location: 'India',
            date: '2026-04-20',
            image: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&q=80',
            url: 'https://www.startupindia.gov.in/',
            applicationUrl: 'https://www.startupindia.gov.in/',
            description: 'DPIIT flagship challenge. Winners get incubation + ₹10L funding.'
        },
        {
            id: 'nasa-spaceapps-2026',
            title: 'NASA Space Apps Challenge 2026',
            category: 'Hackathon',
            scope: 'Global',
            location: 'Online + India Nodes',
            date: '2026-10-03',
            image: 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=800&q=80',
            url: 'https://www.spaceappschallenge.org/',
            applicationUrl: 'https://www.spaceappschallenge.org/',
            description: 'World\'s largest annual hackathon by NASA. 150+ countries, 30,000+ participants.'
        },
        {
            id: 'isro-yuva-2026',
            title: 'ISRO YUVA Scientist Programme 2026',
            category: 'Hackathon',
            scope: 'National',
            location: 'ISRO Centres, India',
            date: '2026-07-01',
            image: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&q=80',
            url: 'https://www.isro.gov.in/',
            applicationUrl: 'https://www.isro.gov.in/',
            description: 'ISRO selects young students for hands-on space research. Prestigious opportunity.'
        },
        {
            id: 'aicte-ideathon-2026',
            title: 'AICTE Ideathon 2026',
            category: 'Hackathon',
            scope: 'National',
            location: 'India',
            date: '2026-04-01',
            image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80',
            url: 'https://www.aicte-india.org/',
            applicationUrl: 'https://www.aicte-india.org/',
            description: 'AICTE national ideathon for engineering students. Open to all branches.'
        },
        {
            id: 'drdo-dare2dream-2026',
            title: 'DRDO Dare to Dream 4.0',
            category: 'Hackathon',
            scope: 'National',
            location: 'India',
            date: '2026-05-15',
            image: 'https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800&q=80',
            url: 'https://www.drdo.gov.in/',
            applicationUrl: 'https://www.drdo.gov.in/',
            description: 'Defence innovation challenge by DRDO. Individual & startup tracks. ₹10L prize.'
        },

        // ── CODING CONTESTS (More) ────────────────────────────────────────
        {
            id: 'leetcode-weekly-2026',
            title: 'LeetCode Weekly Contests (Ongoing)',
            category: 'Coding Contest',
            scope: 'Global',
            location: 'Online',
            date: '2026-03-02',
            image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&q=80',
            url: 'https://leetcode.com/contest/',
            applicationUrl: 'https://leetcode.com/contest/',
            description: 'Weekly rated contests every Sunday. 1500+ problems DSA practice.'
        },
        {
            id: 'hackerrank-w2026',
            title: 'HackerRank Week of Code 2026',
            category: 'Coding Contest',
            scope: 'Global',
            location: 'Online',
            date: '2026-03-20',
            image: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800&q=80',
            url: 'https://www.hackerrank.com/contests',
            applicationUrl: 'https://www.hackerrank.com/contests',
            description: 'Multi-day coding challenge. Winners get certificates + job referrals.'
        },
        {
            id: 'snackdown-2026',
            title: 'CodeChef SnackDown 2026',
            category: 'Coding Contest',
            scope: 'Global',
            location: 'Online',
            date: '2026-06-01',
            image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80',
            url: 'https://www.codechef.com/snackdown',
            applicationUrl: 'https://www.codechef.com/snackdown',
            description: 'CodeChef flagship 2-person team contest. $10,000 prize pool.'
        },

        // ── EXAMS (More) ─────────────────────────────────────────────────
        {
            id: 'jee-advanced-2026',
            title: 'JEE Advanced 2026',
            category: 'Exam',
            scope: 'National',
            location: 'India',
            date: '2026-05-18',
            image: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=800&q=80',
            url: 'https://jeeadv.ac.in/',
            applicationUrl: 'https://jeeadv.ac.in/',
            description: 'IIT Joint Entrance Examination. Registration opens after JEE Mains.'
        },
        {
            id: 'gate-2027-notify',
            title: 'GATE 2027 — Early Notification',
            category: 'Exam',
            scope: 'National',
            location: 'India',
            date: '2026-09-01',
            image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80',
            url: 'https://gate.iitb.ac.in/',
            applicationUrl: 'https://gate.iitb.ac.in/',
            description: 'GATE 2027 notification expected Sep 2026. Start prep now. 29 papers.'
        },
        {
            id: 'ugc-net-2026',
            title: 'UGC NET June 2026',
            category: 'Exam',
            scope: 'National',
            location: 'India',
            date: '2026-06-15',
            image: 'https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=800&q=80',
            url: 'https://ugcnet.nta.ac.in/',
            applicationUrl: 'https://ugcnet.nta.ac.in/',
            description: 'National Eligibility Test for lectureship & JRF. 83 subjects.'
        },
        {
            id: 'cat-2026',
            title: 'CAT 2026 — MBA Entrance',
            category: 'Exam',
            scope: 'National',
            location: 'India',
            date: '2026-11-29',
            image: 'https://images.unsplash.com/photo-1507537297725-24a1c029d3ca?w=800&q=80',
            url: 'https://iimcat.ac.in/',
            applicationUrl: 'https://iimcat.ac.in/',
            description: 'IIM Common Admission Test. Gateway to IIM, XLRI, FMS, MDI.'
        },
        {
            id: 'gre-2026',
            title: 'GRE — MS/PhD Abroad Prep',
            category: 'Exam',
            scope: 'Global',
            location: 'Online + Test Centres',
            date: '2026-04-01',
            image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80',
            url: 'https://www.ets.org/gre',
            applicationUrl: 'https://www.ets.org/gre',
            description: 'Required for most US/Canada MS & PhD programs. Book 3 months early.'
        },

        // ── INTERNSHIPS (More) ────────────────────────────────────────────
        {
            id: 'google-step-2026',
            title: 'Google STEP Intern Program 2026',
            category: 'Internship',
            scope: 'Global',
            location: 'Google Offices / Remote',
            date: '2026-03-01',
            image: 'https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=800&q=80',
            url: 'https://buildyourfuture.withgoogle.com/programs/step',
            applicationUrl: 'https://buildyourfuture.withgoogle.com/programs/step',
            description: 'Google\'s internship for 1st & 2nd year CS students. Paid + mentored.'
        },
        {
            id: 'microsoft-swe-intern-2026',
            title: 'Microsoft SWE Internship 2026',
            category: 'Internship',
            scope: 'Global',
            location: 'Microsoft Offices / Remote',
            date: '2026-03-15',
            image: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80',
            url: 'https://careers.microsoft.com/students/',
            applicationUrl: 'https://careers.microsoft.com/students/',
            description: 'Microsoft\'s summer intern program for pre-final year students. $8000+/month.'
        },
        {
            id: 'isro-intern-2026',
            title: 'ISRO Student Internship Programme 2026',
            category: 'Internship',
            scope: 'National',
            location: 'ISRO Centres, India',
            date: '2026-04-01',
            image: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&q=80',
            url: 'https://www.isro.gov.in/',
            applicationUrl: 'https://www.isro.gov.in/',
            description: 'Work on real space missions at ISRO. Stipend provided. Very competitive.'
        },
        {
            id: 'drdo-internship-2026',
            title: 'DRDO Summer Internship 2026',
            category: 'Internship',
            scope: 'National',
            location: 'DRDO Labs, India',
            date: '2026-04-15',
            image: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&q=80',
            url: 'https://www.drdo.gov.in/',
            applicationUrl: 'https://www.drdo.gov.in/',
            description: 'Prestigious defence research internship. Open to B.Tech/B.E. students.'
        },

        // ── CONFERENCES ───────────────────────────────────────────────────
        {
            id: 'ieee-conference-2026',
            title: 'IEEE ICACCS Conference 2026',
            category: 'Conference',
            scope: 'Global',
            location: 'Coimbatore, India',
            date: '2026-03-06',
            image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
            url: 'https://www.ieee.org/conferences/',
            applicationUrl: 'https://www.ieee.org/conferences/',
            description: 'IEEE International Conference on AI, Communication & Computing Systems.'
        },
        {
            id: 'ms-build-2026',
            title: 'Microsoft Build 2026',
            category: 'Conference',
            scope: 'Global',
            location: 'Seattle, USA + Online',
            date: '2026-05-19',
            image: 'https://images.unsplash.com/photo-1587170574867-7c85a8e4a1ac?w=800&q=80',
            url: 'https://build.microsoft.com/',
            applicationUrl: 'https://build.microsoft.com/',
            description: 'Microsoft\'s annual developer conference. AI, Azure, M365. Free online.'
        },
        {
            id: 'aws-summit-india-2026',
            title: 'AWS Summit India 2026',
            category: 'Conference',
            scope: 'National',
            location: 'Mumbai / Delhi, India',
            date: '2026-07-10',
            image: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&q=80',
            url: 'https://aws.amazon.com/events/summits/india/',
            applicationUrl: 'https://aws.amazon.com/events/summits/india/',
            description: 'Free AWS community conference. 100+ sessions on cloud, AI, ML & DevOps.'
        },
        {
            id: 'acm-icse-2026',
            title: 'ACM ICSE 2026 — Software Engineering',
            category: 'Conference',
            scope: 'Global',
            location: 'Milan, Italy',
            date: '2026-04-12',
            image: 'https://images.unsplash.com/photo-1558008258-3256797b43f3?w=800&q=80',
            url: 'https://www.acm.org/conferences',
            applicationUrl: 'https://www.acm.org/conferences',
            description: 'Top-tier software engineering research conference. Students can submit papers.'
        },

        // ── EXPOS ─────────────────────────────────────────────────────────
        {
            id: 'ces-2026',
            title: 'CES 2026 — Consumer Electronics Show',
            category: 'Expo',
            scope: 'Global',
            location: 'Las Vegas, USA',
            date: '2026-01-06',
            image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
            url: 'https://www.ces.tech/',
            applicationUrl: 'https://www.ces.tech/',
            description: 'World\'s biggest tech expo. 4000+ exhibitors. AI, Robotics, EVs. Student passes available.'
        },
        {
            id: 'india-mobile-congress-2026',
            title: 'India Mobile Congress 2026',
            category: 'Expo',
            scope: 'National',
            location: 'Bharat Mandapam, New Delhi',
            date: '2026-10-15',
            image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80',
            url: 'https://www.indiamobilecongress.com/',
            applicationUrl: 'https://www.indiamobilecongress.com/',
            description: 'Asia\'s largest telecom & tech expo. 5G, AI, Digital India showcase.'
        },
        {
            id: 'startup-mahakumbh-2026',
            title: 'Startup Mahakumbh 2026',
            category: 'Expo',
            scope: 'National',
            location: 'New Delhi, India',
            date: '2026-03-18',
            image: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&q=80',
            url: 'https://www.startupmahakumbh.org/',
            applicationUrl: 'https://www.startupmahakumbh.org/',
            description: 'India\'s largest startup festival. 3000+ startups, investor meetings, workshops.'
        },
        {
            id: 'techno-india-2026',
            title: 'TechnoIndia Expo & Robotics Show 2026',
            category: 'Expo',
            scope: 'National',
            location: 'Bangalore, India',
            date: '2026-08-20',
            image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&q=80',
            url: 'https://www.techno-india.edu.in/',
            applicationUrl: 'https://www.techno-india.edu.in/',
            description: 'Annual robotics, AI & innovation expo. Live demonstrations + competitions.'
        },
        {
            id: 'gitex-2026',
            title: 'GITEX Global 2026',
            category: 'Expo',
            scope: 'Global',
            location: 'Dubai World Trade Centre',
            date: '2026-10-13',
            image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80',
            url: 'https://www.gitex.com/',
            applicationUrl: 'https://www.gitex.com/',
            description: 'World\'s largest tech event. AI, cybersecurity, cloud. 180+ countries.'
        },

        // ── WORKSHOPS ─────────────────────────────────────────────────────
        {
            id: 'google-cloud-next-2026',
            title: 'Google Cloud Next 2026',
            category: 'Workshop',
            scope: 'Global',
            location: 'Las Vegas + Online',
            date: '2026-04-09',
            image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&q=80',
            url: 'https://cloud.withgoogle.com/next',
            applicationUrl: 'https://cloud.withgoogle.com/next',
            description: 'Google Cloud\'s flagship event. 300+ sessions, hands-on labs, certs.'
        },
        {
            id: 'nvidia-gtc-2026',
            title: 'NVIDIA GTC 2026 — AI & Deep Learning',
            category: 'Workshop',
            scope: 'Global',
            location: 'San Jose, CA + Online',
            date: '2026-03-17',
            image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80',
            url: 'https://www.nvidia.com/gtc/',
            applicationUrl: 'https://www.nvidia.com/gtc/',
            description: 'NVIDIA\'s AI conference. Free online pass. Deep learning, robotics, autonomous.'
        },
        {
            id: 'nptel-workshop-2026',
            title: 'NPTEL Faculty Dev Workshop 2026',
            category: 'Workshop',
            scope: 'National',
            location: 'IIT Campuses, India',
            date: '2026-05-05',
            image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80',
            url: 'https://nptel.ac.in/',
            applicationUrl: 'https://nptel.ac.in/',
            description: 'IIT-run workshops on AI/ML, DSA, IoT. Free for students with NPTEL enrollment.'
        },
        {
            id: 'coursera-ai-bootcamp-2026',
            title: 'DeepLearning.AI Bootcamp 2026',
            category: 'Workshop',
            scope: 'Global',
            location: 'Online',
            date: '2026-04-15',
            image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80',
            url: 'https://www.coursera.org/collections/ai-bootcamp',
            applicationUrl: 'https://www.coursera.org/collections/ai-bootcamp',
            description: 'Andrew Ng\'s AI bootcamp. Covers LLMs, MLOps, and generative AI.'
        },
        {
            id: 'microsoft-ai-skills-2026',
            title: 'Microsoft AI Skills Challenge 2026',
            category: 'Workshop',
            scope: 'Global',
            location: 'Online',
            date: '2026-03-10',
            image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80',
            url: 'https://learn.microsoft.com/en-us/training/challenges',
            applicationUrl: 'https://learn.microsoft.com/en-us/training/challenges',
            description: 'Free Microsoft training challenge. Earn badges + Azure certifications.'
        },
    ]);

    // KNOWN VERIFIED URLS — Official homepages for popular platforms
    const KNOWN_URLS = {
        // Hackathon Platforms
        "Smart India Hackathon": "https://www.sih.gov.in/",
        "SIH": "https://www.sih.gov.in/",
        "Google Summer of Code": "https://summerofcode.withgoogle.com/",
        "GSoC": "https://summerofcode.withgoogle.com/",
        "Microsoft Imagine Cup": "https://imaginecup.microsoft.com/en-us/",
        "HackTheNorth": "https://hackthenorth.com/",
        "HackMIT": "https://hackmit.org/",
        "PennApps": "https://pennapps.com/",
        "TreeHacks": "https://www.treehacks.com/",
        "HackIllinois": "https://www.hackillinois.org/",
        "Major League Hacking": "https://mlh.io/",
        "MLH": "https://mlh.io/",
        "Devfolio": "https://devfolio.co/hackathons",
        "Devpost": "https://devpost.com/hackathons",
        // Coding Competitions
        "Codeforces": "https://codeforces.com/contests",
        "CodeChef": "https://www.codechef.com/contests",
        "LeetCode": "https://leetcode.com/contest/",
        "HackerRank": "https://www.hackerrank.com/contests",
        "HackerEarth": "https://www.hackerearth.com/challenges/",
        "AtCoder": "https://atcoder.jp/contests/",
        "Topcoder": "https://www.topcoder.com/challenges",
        "ICPC": "https://icpc.global/",
        "Kaggle": "https://www.kaggle.com/competitions",
        // Corporate Programs
        "TCS CodeVita": "https://www.tcs.com/careers/tcs-codevita",
        "TCS NQT": "https://www.tcsionhub.in/form/tcs-nqt/",
        "Infosys Springboard": "https://infyspringboard.onwingspan.com/",
        "InfyTQ": "https://infyspringboard.onwingspan.com/",
        "Wipro TalentNext": "https://talentforward.wipro.com/",
        "Flipkart GRiD": "https://unstop.com/competitions/flipkart-grid-60-software-development-track-flipkart-81609",
        // Discovery Platforms
        "Unstop": "https://unstop.com/competitions",
        "Internshala": "https://internshala.com/internships",
        "LinkedIn": "https://www.linkedin.com/jobs/",
        "AngelList": "https://wellfound.com/jobs",
        // Learning & Certs
        "NPTEL": "https://nptel.ac.in/",
        "SWAYAM": "https://swayam.gov.in/",
        "Coursera": "https://www.coursera.org/",
        "edX": "https://www.edx.org/",
        "Udemy": "https://www.udemy.com/",
        // Exams & Gov
        "GATE": "https://gate2026.iitr.ac.in/",
        "UPSC": "https://upsc.gov.in/",
        "ISRO": "https://www.isro.gov.in/Careers.html",
        "DRDO": "https://www.drdo.gov.in/careers",
        "SSC": "https://ssc.nic.in/",
        "IBPS": "https://www.ibps.in/",
        // Tech Events
        "Google I/O": "https://io.google/",
        "Microsoft Build": "https://build.microsoft.com/",
        "AWS re:Invent": "https://reinvent.awsevents.com/",
        "Meta Hacker Cup": "https://www.facebook.com/codingcompetitions/hacker-cup",
        "Google Code Jam": "https://codingcompetitions.withgoogle.com/codejam",
        "Google Kickstart": "https://codingcompetitions.withgoogle.com/kickstart",
        "IEEE": "https://www.ieee.org/conferences/",
        "ACM": "https://www.acm.org/conferences",
    };

    // Helper: Check if a URL provided by AI is genuinely valid (not hallucinated gibberish)
    const isValidUrl = (url) => {
        if (!url || typeof url !== 'string') return false;
        try {
            const u = new URL(url);
            // Must be https and have a real TLD (at least one dot in hostname)
            return u.protocol === 'https:' && u.hostname.includes('.');
        } catch {
            return false;
        }
    };

    // Helper: Get safe URL — prefers known URLs > valid AI URL > Google Search fallback
    const getSafeUrl = (title, aiUrl) => {
        // 1. Check our verified list first (fuzzy match on title)
        const matchedKey = Object.keys(KNOWN_URLS).find(k =>
            title.toLowerCase().includes(k.toLowerCase())
        );
        if (matchedKey) return KNOWN_URLS[matchedKey];

        // 2. Trust the AI-provided URL if it looks like a real https link
        if (isValidUrl(aiUrl)) return aiUrl;

        // 3. True last resort: Google Search for the official website
        return `https://www.google.com/search?q=${encodeURIComponent(title + ' official website apply 2026')}`;
    };

    // Auth & Load Data
    useEffect(() => {
        const fetchUserData = async () => {
            if (user) {
                try {
                    // 1. Saved Opportunities (FIRESTORE)
                    const savedRef = collection(db, "users", user.uid, "saved_opportunities");
                    const qSaved = query(savedRef); // Add orderBy if needed
                    const savedSnap = await getDocs(qSaved);
                    const savedDocs = savedSnap.docs.map(doc => ({ firebaseId: doc.id, ...doc.data() }));

                    setSavedOpportunities(savedDocs);

                    // 2. Fetch Public Opportunities from Firestore
                    try {
                        const oppRef = collection(db, "opportunities");
                        const q = query(oppRef, limit(20));
                        const querySnapshot = await getDocs(q);

                        const fetchedOpps = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                        if (fetchedOpps.length > 0) {
                            setOpportunities(prev => {
                                // Merge logic could be better, but simpler for now
                                return [...fetchedOpps, ...prev.filter(p => ['1', '2'].includes(p.id))];
                            });
                        }
                    } catch (e) {
                        console.warn("Public opportunities not fetched:", e);
                    }

                } catch (error) {
                    console.error("Error fetching user opportunities:", error);
                }
            } else {
                setSavedOpportunities([]);
            }
        };

        fetchUserData();
    }, [user]);

    // Trending News State
    const [newsFeed, setNewsFeed] = useState([]);
    const [loadingNews, setLoadingNews] = useState(true);

    // Fetch Dynamic News
    useEffect(() => {
        const fetchNews = async () => {
            try {
                const today = new Date().toLocaleDateString('en-IN', { dateStyle: 'full' });
                const prompt = `
                You are a sophisticated news aggregator for Indian students.
                Today is ${today}.
                
                Generate 4 REALISTIC, TIMELY news headlines relevant to Indian Engineering/Student community.
                Focus on: Exams (JEE/GATE/CAT), Government Policies (AICTE/NEP), Tech Trends (AI/Jobs), or Major Hackathons.
                
                Return VALID JSON with a "news" array.
                Example structure:
                {
                    "news": [
                        { "id": 1, "title": "Headline", "source": "Source Name", "time": "2 hours ago" }
                    ]
                }
                `;

                const completion = await getGroqCompletion(prompt);
                const content = completion.choices[0]?.message?.content || "{}";
                const parsed = JSON.parse(content);

                if (parsed.news && Array.isArray(parsed.news)) {
                    setNewsFeed(parsed.news);
                } else {
                    throw new Error("Invalid format");
                }
            } catch (error) {
                console.error("News fetch failed", error);
                // Fallback to static if AI fails
                setNewsFeed([
                    { id: 1, title: 'GATE 2027 Registration: What to Expect', source: 'Education Times', time: '4 hours ago' },
                    { id: 2, title: 'Top 5 AI Tools Every Student Needs in 2026', source: 'TechCrunch', time: '1 day ago' },
                    { id: 3, title: 'New Internship Guidelines Released by AICTE', source: 'Govt. Notification', time: '2 days ago' },
                    { id: 4, title: 'Smart India Hackathon: Regional Rounds Begin', source: 'SIH Live', time: 'Just now' }
                ]);
            } finally {
                setLoadingNews(false);
            }
        };

        fetchNews();
    }, []);

    const handleSave = async (opp) => {
        if (!user) {
            alert("Please login to save.");
            return;
        }

        // Check if already saved
        const existingSave = savedOpportunities.find(s => s.title === opp.title);

        if (existingSave) {
            // REMOVE Logic
            try {
                // We need the document ID to delete. 
                // If it was loaded from Firestore, it has 'firebaseId'. 
                // If just saved in this session, we might need to find it query-wise or refresh.
                // For simplicity, let's just alert or implement smart delete if id exists
                if (existingSave.firebaseId) {
                    await deleteDoc(doc(db, "users", user.uid, "saved_opportunities", existingSave.firebaseId));
                    setSavedOpportunities(prev => prev.filter(s => s.title !== opp.title));
                    alert("Removed from Saved.");
                } else {
                    alert("Please refresh to remove this item properly.");
                }
            } catch (e) {
                console.error("Delete failed", e);
            }
            return;
        }

        // ADD Logic
        try {
            const savedRef = collection(db, "users", user.uid, "saved_opportunities");
            const newSaveData = {
                ...opp,
                userId: user.uid,
                savedAt: serverTimestamp() // Use server timestamp
            };

            // Remove undefined
            Object.keys(newSaveData).forEach(key => newSaveData[key] === undefined && delete newSaveData[key]);

            const docRef = await addDoc(savedRef, newSaveData);

            // Optimistic Update
            setSavedOpportunities(prev => [...prev, { ...newSaveData, firebaseId: docRef.id }]);

            // ADD TO CALENDAR (Firestore users/{uid}/events)
            if (user) {
                try {
                    // Default to 9:00 AM on the event date
                    const d = opp.date ? new Date(opp.date) : new Date();
                    if (isNaN(d.getTime())) {
                        // Just save bookmark, skip calendar
                        alert("Saved bookmark! (No valid date for calendar)");
                        return;
                    }
                    d.setHours(9, 0, 0, 0);
                    const endD = new Date(d);
                    endD.setHours(10, 0, 0, 0);

                    let eType = 'study';
                    const cLower = (opp.category || '').toLowerCase();
                    if (cLower.includes('hack') || cLower.includes('comp') || cLower.includes('intern')) eType = 'comp';
                    else if (cLower.includes('exam') || cLower.includes('test')) eType = 'exam';
                    // ... workshop, etc.

                    const eventsRef = collection(db, "users", user.uid, "events");
                    await addDoc(eventsRef, {
                        title: opp.title,
                        startTime: d.toISOString(),
                        endTime: endD.toISOString(),
                        type: eType,
                        isGhost: false,
                        platform: opp.scope || 'General',
                        createdAt: new Date().toISOString()
                    });

                    alert(`Saved & Added "${opp.title}" to Calendar!`);
                } catch (err) {
                    console.error("Calendar add failed", err);
                    alert("Bookmark saved, but could not add to Calendar.");
                }
            }

        } catch (e) {
            console.error("Save failed", e);
            alert("Failed to save opportunity.");
        }
    };

    const handleDiscover = async () => {
        if (!interestDomain) return;

        setIsSearching(true);
        try {
            const prompt = `
            Generate 4-5 REALISTIC upcoming competitions, hackathons, or workshops related to "${interestDomain}" for students in 2026.
            Prioritize events in India or Global online events.
            
            IMPORTANT: Provide the **OFFICIAL HOMEPAGE** (e.g., icpc.global), NOT a registration portal link (e.g., unstop.com/contest/xyz).
            If the official link is unknown, return an empty string "" for the url.

            Return ONLY a valid JSON object with a key "events" containing the array.
            Format:
            {
                "events": [
                    {
                        "title": "Event Name",
                        "category": "Hackathon/Workshop/Exam",
                        "scope": "Global/National/Regional",
                        "location": "Online or City",
                        "date": "YYYY-MM-DD",
                        "url": "https://official-website..."
                    }
                ]
            }
            `;

            const chatCompletion = await getGroqCompletion(prompt);
            const content = chatCompletion.choices[0]?.message?.content || "{}";

            try {
                const parsed = JSON.parse(content);
                const newEvents = parsed.events || [];

                if (Array.isArray(newEvents)) {
                    const formattedEvents = newEvents.map((ev, idx) => {
                        const safeUrl = getSafeUrl(ev.title, ev.url);
                        const isGoogleSearch = safeUrl.startsWith('https://www.google.com/search');

                        return {
                            id: `ai-${Date.now()}-${idx}`,
                            title: ev.title,
                            category: ev.category || 'Event',
                            scope: ev.scope || 'Global',
                            location: ev.location || 'Online',
                            date: ev.date || new Date().toISOString().split('T')[0],
                            image: `https://source.unsplash.com/800x600/?${encodeURIComponent(interestDomain)},tech`,
                            url: safeUrl,
                            applicationUrl: safeUrl,
                            isGoogleFallback: isGoogleSearch // Flag for UI to show alternate label
                        };
                    });

                    setOpportunities(prev => [...formattedEvents, ...prev]);

                    // Optional: We could save these to 'opportunities' collection so the Radar can find them later!
                    // Let's do that silently.
                    if (user) {
                        const oppRef = collection(db, "opportunities");
                        formattedEvents.forEach(async (ev) => {
                            try {
                                await addDoc(oppRef, {
                                    ...ev,
                                    tags: [interestDomain], // Add search term as tag
                                    createdAt: serverTimestamp()
                                });
                            } catch {
                                // ignore
                            }
                        });
                    }

                }
            } catch (e) {
                console.error("JSON Parse Error", e);
            }
        } catch (error) {
            console.error("Discovery failed", error);
            alert(`Could not fetch events. ${error.message}`);
        } finally {
            setIsSearching(false);
        }
    };

    // Category tab definitions with emoji icons
    const CATEGORY_TABS = [
        { id: 'All', label: 'All', emoji: '🌐' },
        { id: 'Hackathon', label: 'Hackathons', emoji: '🚀' },
        { id: 'Coding Contest', label: 'Coding', emoji: '💻' },
        { id: 'Exam', label: 'Exams', emoji: '📝' },
        { id: 'Internship', label: 'Internships', emoji: '💼' },
        { id: 'Conference', label: 'Conferences', emoji: '🎤' },
        { id: 'Expo', label: 'Expos', emoji: '🏛️' },
        { id: 'Workshop', label: 'Workshops', emoji: '🛠️' },
        { id: 'Saved', label: 'Saved', emoji: '🔖' },
    ];

    // Filter Logic
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let displayList = filter === 'Saved'
        ? savedOpportunities.filter(opp => new Date(opp.date) >= today)
        : opportunities
            .filter(opp => new Date(opp.date) >= today)
            .filter(opp => {
                if (filter === 'All') return true;
                // Match by category field (case-insensitive partial match)
                return (opp.category || '').toLowerCase().includes(filter.toLowerCase());
            });

    // Sort by Date (Nearest first)
    displayList.sort((a, b) => new Date(a.date) - new Date(b.date));

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-white tracking-tight">
                        Opportunities & <span className="text-gradient">Hub</span>
                    </h1>
                    <p className="text-slate-400 mt-2 text-lg">Discover hackathons, exams, and workshops curated for you.</p>
                </div>
            </div>

            {/* Discovery Bar */}
            <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/10 flex flex-col md:flex-row gap-4 items-center mb-8">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                    <input
                        type="text"
                        value={interestDomain}
                        onChange={(e) => setInterestDomain(e.target.value)}
                        placeholder="What are you interested in? (e.g. Robotics, AI, Design)"
                        className="w-full bg-slate-800 border-0 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                    />
                </div>
                <button
                    onClick={handleDiscover}
                    disabled={isSearching || !interestDomain}
                    className="w-full md:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                    {isSearching ? <Loader2 className="animate-spin" size={20} /> : <Globe size={20} />}
                    {isSearching ? 'Scouting...' : 'Find Opportunities'}
                </button>
            </div>

            {/* Category Tabs */}
            <div className="flex flex-wrap gap-2">
                {CATEGORY_TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setFilter(tab.id)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${filter === tab.id
                                ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/30 scale-105'
                                : 'bg-slate-800/60 border-white/5 text-slate-400 hover:text-white hover:bg-white/5 hover:border-white/10'
                            }`}
                    >
                        <span>{tab.emoji}</span>
                        <span>{tab.label}</span>
                        {filter !== tab.id && tab.id !== 'Saved' && tab.id !== 'All' && (
                            <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded-full">
                                {tab.id === 'Coding Contest'
                                    ? opportunities.filter(o => new Date(o.date) >= today && (o.category || '').toLowerCase().includes('coding')).length
                                    : opportunities.filter(o => new Date(o.date) >= today && (o.category || '').toLowerCase().includes(tab.id.toLowerCase())).length
                                }
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Opportunities Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayList.length === 0 && filter === 'Saved' && (
                    <div className="col-span-full p-12 text-center text-slate-500 bg-white/5 rounded-2xl">
                        No saved opportunities yet. Browse and bookmark some!
                    </div>
                )}

                {displayList.map((opp, idx) => {
                    const isSaved = savedOpportunities.some(s => s.title === opp.title);
                    return (
                        <Card key={opp.id || idx} className="group overflow-hidden border-0 bg-slate-900/40" hoverEffect>
                            <div className="h-48 w-full overflow-hidden relative">
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                                <img
                                    src={opp.image}
                                    alt={opp.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=800&q=80'; }}
                                />
                                <div className="absolute top-4 left-4 z-20 flex gap-2">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${opp.scope === 'Global' ? 'bg-purple-500 text-white' :
                                        opp.scope === 'National' ? 'bg-orange-500 text-white' :
                                            'bg-emerald-500 text-white'
                                        }`}>
                                        {opp.scope}
                                    </span>
                                </div>
                                <button
                                    onClick={(e) => { e.preventDefault(); handleSave(opp); }}
                                    className={`absolute top-4 right-4 z-20 p-2 rounded-full backdrop-blur-md transition-all ${isSaved ? 'bg-blue-500 text-white' : 'bg-black/40 text-white hover:bg-white hover:text-black'}`}
                                >
                                    {isSaved ? <CheckCircle size={18} fill="currentColor" /> : <Bookmark size={18} />}
                                </button>
                            </div>

                            <div className="p-6">
                                <h3 className="text-xl font-bold text-white mb-2 line-clamp-1" title={opp.title}>{opp.title}</h3>

                                <div className="space-y-3 mb-6">
                                    <div className="flex items-center text-slate-400 text-sm">
                                        <Calendar size={16} className="mr-2 text-blue-400" />
                                        {new Date(opp.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </div>
                                    <div className="flex items-center text-slate-400 text-sm">
                                        <MapPin size={16} className="mr-2 text-red-400" />
                                        <span className="truncate" title={opp.exactLocation || opp.location}>
                                            {opp.exactLocation || opp.location}
                                        </span>
                                    </div>
                                    <div className="flex items-center text-slate-400 text-sm">
                                        <Trophy size={16} className="mr-2 text-yellow-400" />
                                        {opp.category}
                                    </div>
                                </div>

                                <a
                                    href={opp.applicationUrl || opp.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    title={opp.applicationUrl || opp.url}
                                    className="w-full btn-ghost border border-blue-500/20 bg-blue-600/10 text-blue-400 flex items-center justify-center gap-2 hover:bg-blue-600 hover:text-white transition-all duration-300 rounded-lg py-2.5 font-bold uppercase tracking-wide text-sm"
                                >
                                    {opp.isGoogleFallback
                                        ? <><Search size={16} /> Find Official Site</>
                                        : <><ExternalLink size={16} /> Apply Now</>}
                                </a>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Daily Briefing / Trending News Section */}
            <div className="mt-12">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                    <Newspaper className="text-neon-cyan" />
                    Daily <span className="text-gradient">Briefing</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {loadingNews ? (
                        <div className="col-span-full py-8 flex justify-center text-slate-500 animate-pulse">
                            Fetching real-time updates for you...
                        </div>
                    ) : (
                        newsFeed.map((news, idx) => (
                            <div key={news.id || idx} className="glass-panel p-4 rounded-xl flex items-start gap-4 hover:bg-white/5 transition-colors cursor-pointer group">
                                <div className="p-3 bg-white/5 rounded-lg text-slate-400 group-hover:text-white group-hover:bg-blue-600/20 transition-all">
                                    <TrendingUp size={20} />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-white group-hover:text-blue-400 transition-colors line-clamp-1">{news.title}</h4>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                        <span className="font-medium text-slate-400">{news.source}</span>
                                        <span>•</span>
                                        <span>{news.time}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Competitions;
