import google.generativeai as genai
import json
import base64
from PIL import Image
import io
import os
from datetime import datetime
from dotenv import load_dotenv
import webbrowser
load_dotenv()

class InteractiveLinkedInAnalyzer:
    def __init__(self, api_key):
        """Initialize the analyzer with Gemini API key"""
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash')
        
    def encode_image_to_base64(self, image_path):
        """Convert image to base64 for embedding in HTML"""
        with open(image_path, "rb") as image_file:
            image_data = image_file.read()
            return base64.b64encode(image_data).decode('utf-8')
    
    def identify_section_coordinates(self, image_path):
        """Identify exact coordinates of the first letter of section titles with enhanced precision"""
        
        image = Image.open(image_path)
        
        coordinate_prompt = """
        You are a computer vision expert specializing in precise text localization in LinkedIn profiles. Your task is to identify the EXACT pixel coordinates of the FIRST LETTER of each section title/header.

        CRITICAL INSTRUCTIONS:
        1. Look for section titles that are typically formatted as headers (bold, larger font, standalone text)
        2. For each section title found, locate the precise position of the FIRST CHARACTER/LETTER
        3. Ignore any icons, bullets, or spacing before the text - focus only on the first letter
        4. Provide coordinates as percentages (0-100) from the top-left corner of the image
        5. x = horizontal distance from left edge to the first letter, y = vertical distance from top edge to the first letter
        6. Be extremely precise - these coordinates will be used to place interactive elements exactly on the first letter

        SECTION TITLES TO DETECT (look for these exact words as headers):
        - "About" (first letter: A)
        - "Experience" (first letter: E)
        - "Education" (first letter: E)
        - "Skills" (first letter: S)
        - "Recommendations" (first letter: R)
        - "Accomplishments" (first letter: A)
        - "Certifications" (first letter: C)
        - "Languages" (first letter: L)
        - "Volunteer experience" (first letter: V)
        - "Projects" (first letter: P)
        - "Publications" (first letter: P)
        - "Honors & awards" (first letter: H)
        - "Test scores" (first letter: T)
        - "Courses" (first letter: C)
        - "Organizations" (first letter: O)
        - "Patents" (first letter: P)
        - "Licenses & certifications" (first letter: L)
        - "Contact info" (first letter: C)

        DETECTION GUIDELINES:
        - Section titles are usually displayed as bold headers
        - They are typically left-aligned and standalone (not part of a paragraph)
        - They often have some vertical spacing above and below them
        - The font size is usually larger than regular content text
        - Look for consistent formatting patterns across sections

        COORDINATE PRECISION:
        - Measure to the leftmost pixel of the first letter
        - Double-check measurements for accuracy
        - If there are multiple sections which are starting with the same first letter, then match the title of the section only.
        - Measure all the coordinates from the leftmost pixel and the top most pixel
        - The coordinates of the First Alphabet of the matched section needs to be taken.

        RESPONSE FORMAT (STRICT JSON):
        {
            "detected_sections": [
                {
                    "section_name": "Experience",
                    "first_letter": "E",
                    "title_coordinates": [x_percentage, y_percentage],
                    "confidence": 95,
                    "font_size_estimate": "large/medium/small",
                    "text_style": "bold/normal",
                    "notes": "Clear header at coordinates, bold formatting"
                }
            ],
            "detection_metadata": {
                "total_sections_found": 5,
                "image_dimensions": [width, height],
                "layout_type": "desktop/mobile",
                "scroll_position": "top/middle/bottom",
                "text_clarity": "high/medium/low"
            }
        }

        QUALITY ASSURANCE:
        - Only include sections where you can clearly see the first letter
        - Confidence should be 80+ for precise coordinates, 60-79 for estimated positions
        - If text is blurry or partially obscured, note it but still provide best estimate
        - Cross-reference with typical LinkedIn layout patterns

        Analyze the image carefully and provide the most accurate coordinates possible for placing interactive elements precisely on the first letter of each section title.
        """
        
        try:
            response = self.model.generate_content([coordinate_prompt, image])
            response_text = response.text
            
            # Extract JSON from response
            if "```json" in response_text:
                json_start = response_text.find("```json") + 7
                json_end = response_text.find("```", json_start)
                json_text = response_text[json_start:json_end].strip()
            else:
                json_start = response_text.find("{")
                json_end = response_text.rfind("}") + 1
                json_text = response_text[json_start:json_end]
            
            coordinates = json.loads(json_text)
            
            # Post-process coordinates for better accuracy
            if coordinates and coordinates.get('detected_sections'):
                # Sort sections by vertical position (top to bottom)
                coordinates['detected_sections'].sort(key=lambda x: x.get('title_coordinates', [0, 0])[1])
                
                # Add validation and adjustment logic
                for section in coordinates['detected_sections']:
                    coords = section.get('title_coordinates', [0, 0])
                    
                    # Ensure coordinates are within valid bounds
                    coords[0] = max(0.0, min(100.0, coords[0]))
                    coords[1] = max(0.0, min(100.0, coords[1]))
                    
                    # Adjust x-coordinate slightly left to account for any margin
                    coords[0] = max(0.0, coords[0] - 0.5)
                    
                    section['title_coordinates'] = coords
                    
                    # Add precision metadata
                    section['coordinate_precision'] = 'high' if section.get('confidence', 0) >= 85 else 'medium'
            
            return coordinates
            
        except json.JSONDecodeError as e:
            print(f"JSON parsing error in coordinate detection: {e}")
            print(f"Raw response: {response_text}")
            return None
            
        except Exception as e:
            print(f"Error in coordinate detection: {e}")
            return None
        
    def analyze_profile(self, image_path, section_coordinates=None):
        """Analyze LinkedIn profile screenshot using Gemini with coordinate context"""
        
        image = Image.open(image_path)
        
        # Build coordinate context for better analysis
        coordinate_context = ""
        if section_coordinates and section_coordinates.get('detected_sections'):
            coordinate_context = f"""
            DETECTED SECTION COORDINATES (for reference):
            {json.dumps(section_coordinates['detected_sections'], indent=2)}
            
            Use these coordinates to provide more accurate bounding boxes for your analysis.
            """
        
        # Updated prompt with coordinate awareness
        prompt = f"""
        You are an expert LinkedIn profile optimization consultant with 15+ years of experience. Analyze this LinkedIn profile screenshot with extreme precision and provide comprehensive feedback.

        {coordinate_context}

        CRITICAL ANALYSIS REQUIREMENTS:
        1. Examine EVERY visible element in the profile screenshot
        2. Use the detected section coordinates above to provide accurate positioning
        3. Apply STRICT professional standards - be harsh but constructive
        4. Focus on conversion optimization and professional branding impact

        MANDATORY SECTIONS TO ANALYZE (if visible):
        - Profile photo (Professional quality, lighting, attire, background, facial expression)
        - Background banner (Brand consistency, visual appeal, message clarity)
        - Headline/title (Keyword optimization, value proposition, character count)
        - Summary/About section (Storytelling, achievements, call-to-action, length)
        - Experience entries (Impact metrics, keyword density, accomplishment focus)
        - Education (Relevance, completeness, additional credentials)
        - Skills section (Strategic selection, endorsement count, relevance)
        - Recommendations (Quality, quantity, diversity, recency)
        - Contact information (Completeness, accessibility)
        - Activity/posts section (Engagement quality, posting frequency, content relevance)
        - Certifications (Industry relevance, credibility, recency)
        - Languages (Professional advantage, proficiency levels)
        - Volunteer experience (Leadership demonstration, social impact)

        POSITIONING INSTRUCTIONS:
        - For section titles, use the exact coordinates provided above
        - Place markers slightly to the right of section titles (add ~5% to x coordinate)
        - For profile elements without detected coordinates, estimate based on typical LinkedIn layout

        SCORING CRITERIA (Be strict and realistic):
        - GREEN (85-100): Exceptional, industry-leading, conversion-optimized
        - YELLOW (60-84): Adequate but significant improvement needed for competitive advantage
        - RED (0-59): Poor quality, severely limiting professional opportunities

        RESPONSE FORMAT (STRICT JSON - NO MARKDOWN):
        {{
            "overall_score": 72,
            "overall_feedback": "Detailed assessment with specific improvement priorities",
            "critical_issues": ["List of 3-5 most urgent problems"],
            "competitive_advantages": ["List of 2-3 strongest elements"],
            "sections": [
                {{
                    "name": "Profile Photo",
                    "coordinates": [x_percentage, y_percentage],
                    "criticality": "yellow",
                    "score": 65,
                    "comment": "Specific, actionable feedback with industry context",
                    "priority": 8,
                    "improvements": ["Specific action item 1", "Specific action item 2", "Specific action item 3"],
                    "industry_benchmark": "How this compares to top 10% of professionals",
                    "impact_on_opportunities": "How this affects job/business prospects",
                    "detailed_analysis": "Extended analysis with specific examples and recommendations"
                }}
            ],
            "missing_elements": ["Critical sections not present in profile"],
            "next_steps": ["Prioritized action plan with timeline suggestions"]
        }}

        Analyze this profile as if the person is competing for their dream role against 200+ other qualified candidates. Be thorough, precise, and constructively critical.
        """
        
        try:
            response = self.model.generate_content([prompt, image])
            response_text = response.text
            
            # Extract JSON from response
            if "```json" in response_text:
                json_start = response_text.find("```json") + 7
                json_end = response_text.find("```", json_start)
                json_text = response_text[json_start:json_end].strip()
            else:
                json_start = response_text.find("{")
                json_end = response_text.rfind("}") + 1
                json_text = response_text[json_start:json_end]
            
            analysis = json.loads(json_text)
            return analysis
            
        except Exception as e:
            print(f"Error in analysis: {e}")
            return None
    
    def create_interactive_html(self, image_path, analysis, output_path):
        """Create interactive HTML page with embedded image and scrollable hoverable comments"""
        
        # Convert image to base64
        image_base64 = self.encode_image_to_base64(image_path)
        
        # Get image dimensions for scaling
        image = Image.open(image_path)
        img_width, img_height = image.size
        
        # Determine image type
        image_format = image.format.lower()
        mime_type = f"image/{image_format}" if image_format in ['png', 'jpeg', 'jpg'] else "image/jpeg"
        
        # Safely get analysis values with defaults
        overall_score = analysis.get('overall_score', 0)
        overall_feedback = analysis.get('overall_feedback', 'No feedback available')
        
        # Determine score class
        if overall_score >= 85:
            score_class = 'score-excellent'
        elif overall_score >= 60:
            score_class = 'score-good'
        else:
            score_class = 'score-poor'
        
        # Create HTML content with enhanced scrollable tooltips
        html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>LinkedIn Profile Analysis - Interactive Report</title>
        <style>
            /* Your existing CSS styles here - keep them as is */
            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}
            
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                padding: 20px;
            }}
            
            .container {{
                max-width: 1400px;
                margin: 0 auto;
                background: white;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.1);
                overflow: hidden;
            }}
            
            .header {{
                background: linear-gradient(135deg, #0077b5, #005885);
                color: white;
                padding: 30px;
                text-align: center;
            }}
            
            .score-display {{
                font-size: 4em;
                font-weight: bold;
                margin: 20px 0;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            }}
            
            .score-excellent {{ color: #00ff88; }}
            .score-good {{ color: #ffeb3b; }}
            .score-poor {{ color: #ff6b6b; }}
            
            .image-container {{
                position: relative;
                width: 100%;
                margin: 0 auto;
                background: #f8f9fa;
                padding: 20px;
            }}
            
            .profile-image {{
                width: 100%;
                height: auto;
                display: block;
                border-radius: 10px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            }}
            
            .info-button {{
                position: absolute;
                width: 26px;
                height: 26px;
                border-radius: 50%;
                color: white;
                font-weight: bold;
                font-size: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                z-index: 10;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                font-family: Arial, sans-serif;
                border: 2px solid white;
            }}
            
            .info-button:hover {{
                transform: scale(1.3);
                box-shadow: 0 8px 25px rgba(0,0,0,0.4);
                z-index: 15;
            }}
            
            .info-button.red {{
                background: linear-gradient(135deg, #ff6b6b, #ee5a52);
                animation: pulse-red 2s infinite;
            }}
            
            .info-button.yellow {{
                background: linear-gradient(135deg, #ffd93d, #ffcd02);
                animation: pulse-yellow 2s infinite;
                color: #333;
            }}
            
            .info-button.green {{
                background: linear-gradient(135deg, #6bcf7f, #4caf50);
            }}
            
            @keyframes pulse-red {{
                0%, 100% {{ transform: scale(1); }}
                50% {{ transform: scale(1.1); }}
            }}
            
            @keyframes pulse-yellow {{
                0%, 100% {{ transform: scale(1); }}
                50% {{ transform: scale(1.05); }}
            }}
            
            /* Enhanced Scrollable Tooltip Styles */
            .tooltip {{
                position: absolute;
                background: rgba(0,0,0,0.95);
                color: white;
                border-radius: 15px;
                font-size: 14px;
                line-height: 1.5;
                width: 420px;
                max-height: 500px;
                z-index: 1000;
                box-shadow: 0 15px 50px rgba(0,0,0,0.4);
                backdrop-filter: blur(15px);
                border: 1px solid rgba(255,255,255,0.1);
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
                pointer-events: none;
                display: flex;
                flex-direction: column;
            }}
            
            .tooltip.show {{
                opacity: 1;
                visibility: visible;
                pointer-events: auto;
            }}
            
            .tooltip::before {{
                content: '';
                position: absolute;
                width: 0;
                height: 0;
                border: 12px solid transparent;
                border-bottom-color: rgba(0,0,0,0.95);
                top: -24px;
                left: 25px;
            }}
            
            .tooltip-header {{
                padding: 20px 20px 15px 20px;
                border-bottom: 1px solid rgba(255,255,255,0.2);
                flex-shrink: 0;
            }}
            
            .tooltip-title {{
                font-weight: bold;
                font-size: 18px;
                color: #4fc3f7;
                margin-bottom: 10px;
            }}
            
            .tooltip-meta {{
                display: flex;
                gap: 15px;
                flex-wrap: wrap;
                margin-bottom: 10px;
            }}
            
            .tooltip-score {{
                background: linear-gradient(135deg, #667eea, #764ba2);
                padding: 5px 12px;
                border-radius: 15px;
                font-size: 12px;
                font-weight: bold;
            }}
            
            .tooltip-priority {{
                background: rgba(255,255,255,0.1);
                padding: 5px 12px;
                border-radius: 15px;
                font-size: 12px;
            }}
            
            .tooltip-content {{
                padding: 0 20px 20px 20px;
                overflow-y: auto;
                flex-grow: 1;
                scrollbar-width: thin;
                scrollbar-color: rgba(255,255,255,0.3) transparent;
            }}
            
            .tooltip-content::-webkit-scrollbar {{
                width: 6px;
            }}
            
            .tooltip-content::-webkit-scrollbar-track {{
                background: rgba(255,255,255,0.1);
                border-radius: 3px;
            }}
            
            .tooltip-content::-webkit-scrollbar-thumb {{
                background: rgba(255,255,255,0.3);
                border-radius: 3px;
            }}
            
            .tooltip-content::-webkit-scrollbar-thumb:hover {{
                background: rgba(255,255,255,0.5);
            }}
            
            .tooltip-section {{
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }}
            
            .tooltip-section:last-child {{
                border-bottom: none;
                margin-bottom: 0;
                padding-bottom: 0;
            }}
            
            .tooltip-section h4 {{
                color: #81c784;
                font-size: 14px;
                margin-bottom: 10px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 8px;
            }}
            
            .tooltip-section p {{
                margin-bottom: 10px;
                color: #e8f5e8;
            }}
            
            .tooltip-section ul {{
                margin: 10px 0;
                padding-left: 20px;
            }}
            
            .tooltip-section li {{
                margin-bottom: 8px;
                color: #e8f5e8;
            }}
            
            .scroll-indicator {{
                position: absolute;
                bottom: 10px;
                right: 15px;
                color: rgba(255,255,255,0.5);
                font-size: 12px;
                animation: fadeInOut 2s infinite;
            }}
            
            @keyframes fadeInOut {{
                0%, 100% {{ opacity: 0.5; }}
                50% {{ opacity: 1; }}
            }}
            
            .summary-section {{
                padding: 40px;
                background: #f8f9fa;
            }}
            
            .summary-grid {{
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 30px;
                margin-top: 30px;
            }}
            
            .summary-card {{
                background: white;
                padding: 25px;
                border-radius: 15px;
                box-shadow: 0 5px 20px rgba(0,0,0,0.1);
                border-left: 5px solid #0077b5;
            }}
            
            .summary-card h3 {{
                color: #0077b5;
                margin-bottom: 15px;
                font-size: 1.2em;
            }}
            
            .summary-card ul {{
                list-style: none;
                padding: 0;
            }}
            
            .summary-card li {{
                margin-bottom: 12px;
                padding: 8px 0;
                border-bottom: 1px solid #eee;
                color: #666;
            }}
            
            .summary-card li:last-child {{
                border-bottom: none;
            }}
            
            .priority-indicator {{
                display: inline-block;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                margin-right: 10px;
            }}
            
            .priority-high {{ background: #ff6b6b; }}
            .priority-medium {{ background: #ffd93d; }}
            .priority-low {{ background: #6bcf7f; }}
            
            .instruction-banner {{
                background: linear-gradient(135deg, #4CAF50, #45a049);
                color: white;
                padding: 15px;
                text-align: center;
                font-size: 16px;
                font-weight: 500;
            }}
            
            .stats-row {{
                display: flex;
                justify-content: space-around;
                margin: 20px 0;
                flex-wrap: wrap;
            }}
            
            .stat-item {{
                text-align: center;
                padding: 10px;
            }}
            
            .stat-number {{
                font-size: 2em;
                font-weight: bold;
                display: block;
            }}
            
            .stat-label {{
                font-size: 0.9em;
                opacity: 0.9;
            }}
            
            @media (max-width: 768px) {{
                .container {{
                    margin: 10px;
                    border-radius: 10px;
                }}
                
                .header {{
                    padding: 20px;
                }}
                
                .score-display {{
                    font-size: 2.5em;
                }}
                
                .image-container {{
                    padding: 10px;
                }}
                
                .info-button {{
                    width: 22px;
                    height: 22px;
                    font-size: 12px;
                }}
                
                .tooltip {{
                    width: 320px;
                    max-height: 400px;
                    font-size: 13px;
                }}
                
                .tooltip-header {{
                    padding: 15px 15px 10px 15px;
                }}
                
                .tooltip-content {{
                    padding: 0 15px 15px 15px;
                }}
                
                .summary-section {{
                    padding: 20px;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔍 LinkedIn Profile Analysis</h1>
                <div class="score-display {score_class}">{overall_score}/100</div>
                <p style="font-size: 1.1em; margin-top: 10px; opacity: 0.95;">{overall_feedback}</p>
        """
        
        # Add statistics - Fix the type conversion issue
        sections = analysis.get('sections', [])
        red_count = len([s for s in sections if s.get('criticality') == 'red'])
        yellow_count = len([s for s in sections if s.get('criticality') == 'yellow'])
        green_count = len([s for s in sections if s.get('criticality') == 'green'])
        total_sections = len(sections)
        
        html_content += f"""
            <div class="stats-row">
                <div class="stat-item">
                    <span class="stat-number" style="color: #ff6b6b;">{red_count}</span>
                    <span class="stat-label">Critical Issues</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number" style="color: #ffd93d;">{yellow_count}</span>
                    <span class="stat-label">Needs Improvement</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number" style="color: #6bcf7f;">{green_count}</span>
                    <span class="stat-label">Excellent</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number" style="color: #4fc3f7;">{total_sections}</span>
                    <span class="stat-label">Total Sections</span>
                </div>
            </div>
        </div>
        
        <div class="instruction-banner">
            💡 <strong>How to use:</strong> Click on the colored "i" buttons to see detailed feedback. Content is scrollable for longer analyses!
        </div>
        
        <div class="image-container">
            <img src="data:{mime_type};base64,{image_base64}" alt="LinkedIn Profile Screenshot" class="profile-image" id="profileImage">
        """
        
        # Add info buttons for each section with improved positioning and safe type conversion
        for i, section in enumerate(sections):
            section_name = section.get('name', f'Section {i+1}')
            
            # Use new coordinate system if available, fallback to bbox
            if 'coordinates' in section and section['coordinates']:
                coordinates = section['coordinates']
                x_pos = float(coordinates[0]) + 3.0  # Ensure float, offset slightly to the right
                y_pos = float(coordinates[1])
            else:
                # Fallback to bbox system
                bbox = section.get('bbox', [0, 0, 10, 10])
                x_pos = float(bbox[2])
                y_pos = float(bbox[1])
            
            criticality = section.get('criticality', 'yellow')
            score = section.get('score', 'N/A')
            comment = section.get('comment', 'No comment available')
            priority = section.get('priority', 5)
            improvements = section.get('improvements', [])
            industry_benchmark = section.get('industry_benchmark', '')
            impact_on_opportunities = section.get('impact_on_opportunities', '')
            detailed_analysis = section.get('detailed_analysis', '')
            
            # Ensure coordinates are within bounds
            x_pos = max(0.0, min(95.0, x_pos))
            y_pos = max(0.0, min(95.0, y_pos))
            
            # Convert score to string if it's a number
            score_display = str(score) if isinstance(score, (int, float)) else score
            priority_display = str(priority) if isinstance(priority, (int, float)) else priority
            
            html_content += f"""
            <div class="info-button {criticality}" 
                style="left: {x_pos:.1f}%; top: {y_pos:.1f}%;"
                data-tooltip-id="tooltip-{i}">
                i
            </div>
            
            <div class="tooltip" id="tooltip-{i}">
                <div class="tooltip-header">
                    <div class="tooltip-title">{section_name}</div>
                    <div class="tooltip-meta">
                        <div class="tooltip-score">Score: {score_display}/100</div>
                        <div class="tooltip-priority">Priority: {priority_display}/10</div>
                    </div>
                </div>
                <div class="tooltip-content">
                    <div class="tooltip-section">
                        <h4>📋 Overview</h4>
                        <p>{comment}</p>
                        {f'<p><strong>Detailed Analysis:</strong> {detailed_analysis}</p>' if detailed_analysis else ''}
                    </div>
            """
            
            # Add improvements section if available
            if improvements:
                html_content += """
                    <div class="tooltip-section">
                        <h4>🎯 Recommended Actions</h4>
                        <ul>
                """
                for imp in improvements[:5]:  # Limit to first 5 improvements
                    html_content += f"<li>{imp}</li>"
                html_content += "</ul></div>"
            
            # Add industry benchmark if available
            if industry_benchmark:
                html_content += f"""
                    <div class="tooltip-section">
                        <h4>📊 Industry Benchmark</h4>
                        <p>{industry_benchmark}</p>
                    </div>
                """
            
            # Add career impact if available
            if impact_on_opportunities:
                html_content += f"""
                    <div class="tooltip-section">
                        <h4>💼 Career Impact</h4>
                        <p>{impact_on_opportunities}</p>
                    </div>
                """
            
            html_content += """
                </div>
                <div class="scroll-indicator">↕ Scroll for more</div>
            </div>
            """
        
        html_content += """
        </div>
        
        <div class="summary-section">
            <h2 style="text-align: center; color: #0077b5; margin-bottom: 30px;">📊 Analysis Summary</h2>
            <div class="summary-grid">
        """
        
        # Add summary cards with safe string handling
        if analysis.get('critical_issues'):
            html_content += """
                <div class="summary-card" style="border-left-color: #ff6b6b;">
                    <h3>🚨 Critical Issues</h3>
                    <ul>
            """
            for issue in analysis['critical_issues']:
                html_content += f"<li><span class='priority-indicator priority-high'></span>{issue}</li>"
            html_content += "</ul></div>"
        
        if analysis.get('competitive_advantages'):
            html_content += """
                <div class="summary-card" style="border-left-color: #6bcf7f;">
                    <h3>💪 Your Strengths</h3>
                    <ul>
            """
            for advantage in analysis['competitive_advantages']:
                html_content += f"<li><span class='priority-indicator priority-low'></span>{advantage}</li>"
            html_content += "</ul></div>"
        
        if analysis.get('next_steps'):
            html_content += """
                <div class="summary-card" style="border-left-color: #4CAF50;">
                    <h3>🎯 Action Plan</h3>
                    <ul>
            """
            for step in analysis['next_steps']:
                html_content += f"<li><span class='priority-indicator priority-medium'></span>{step}</li>"
            html_content += "</ul></div>"
        
        if analysis.get('missing_elements'):
            html_content += """
                <div class="summary-card" style="border-left-color: #ff9800;">
                    <h3>📋 Missing Elements</h3>
                    <ul>
            """
            for element in analysis['missing_elements']:
                html_content += f"<li><span class='priority-indicator priority-medium'></span>{element}</li>"
            html_content += "</ul></div>"
        
        html_content += """
            </div>
        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const infoButtons = document.querySelectorAll('.info-button');
            const tooltips = document.querySelectorAll('.tooltip');
            
            infoButtons.forEach(button => {
                const tooltipId = button.getAttribute('data-tooltip-id');
                const tooltip = document.getElementById(tooltipId);
                
                // Click to toggle tooltip
                button.addEventListener('click', function(e) {
                    e.stopPropagation();
                    
                    // Hide all other tooltips
                    tooltips.forEach(t => {
                        if (t !== tooltip) {
                            t.classList.remove('show');
                        }
                    });
                    
                    // Toggle current tooltip
                    if (tooltip.classList.contains('show')) {
                        tooltip.classList.remove('show');
                    } else {
                        positionTooltip(button, tooltip);
                        tooltip.classList.add('show');
                    }
                });
                
                // Hover effects
                button.addEventListener('mouseenter', function() {
                    button.style.transform = 'scale(1.2)';
                });
                
                button.addEventListener('mouseleave', function() {
                    if (!tooltip.classList.contains('show')) {
                        button.style.transform = 'scale(1)';
                    }
                });
            });
            
            function positionTooltip(button, tooltip) {
                const rect = button.getBoundingClientRect();
                const containerRect = document.querySelector('.image-container').getBoundingClientRect();
                
                let left = rect.left - containerRect.left + rect.width + 15;
                let top = rect.top - containerRect.top - 20;
                
                // Ensure tooltip stays within viewport
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                
            if (top + 300 > viewportHeight - containerRect.top) {
                    top = rect.top - containerRect.top - 300 + rect.height;
                }
                
                tooltip.style.left = left + 'px';
                tooltip.style.top = top + 'px';
            }
            
            // Close tooltips when clicking outside
            document.addEventListener('click', function(e) {
                if (!e.target.closest('.info-button') && !e.target.closest('.tooltip')) {
                    tooltips.forEach(tooltip => {
                        tooltip.classList.remove('show');
                    });
                    
                    // Reset button scales
                    infoButtons.forEach(button => {
                        button.style.transform = 'scale(1)';
                    });
                }
            });
            
            // Prevent tooltip from closing when clicking inside it
            tooltips.forEach(tooltip => {
                tooltip.addEventListener('click', function(e) {
                    e.stopPropagation();
                });
            });
            
            // Handle window resize
            window.addEventListener('resize', function() {
                tooltips.forEach(tooltip => {
                    if (tooltip.classList.contains('show')) {
                        tooltip.classList.remove('show');
                    }
                });
            });
        });
    </script>
    </body>
    </html>
        """
        
        # Write HTML file
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        print(f"Interactive HTML report created: {output_path}")
        return output_path
    def analyze_and_create_report(self, image_path, output_dir="linkedin_analysis"):
        """Complete workflow: coordinate detection -> analysis -> interactive report"""
        
        # Create output directory
        os.makedirs(output_dir, exist_ok=True)
        
        # Step 1: Detect section coordinates
        print("🔍 Step 1: Detecting section coordinates...")
        section_coordinates = self.identify_section_coordinates(image_path)
        
        if section_coordinates:
            print(f"✅ Detected {len(section_coordinates.get('detected_sections', []))} sections")
            
            # Save coordinates for debugging
            coords_file = os.path.join(output_dir, "detected_coordinates.json")
            with open(coords_file, 'w') as f:
                json.dump(section_coordinates, f, indent=2)
            print(f"📋 Coordinates saved to: {coords_file}")
        else:
            print("⚠️  Coordinate detection failed, proceeding with estimated positions")
            section_coordinates = None
        
        # Step 2: Analyze profile with coordinate context
        print("🤖 Step 2: Analyzing LinkedIn profile...")
        analysis = self.analyze_profile(image_path, section_coordinates)
        
        if not analysis:
            print("❌ Profile analysis failed")
            return None
        
        # Save analysis JSON
        analysis_file = os.path.join(output_dir, "analysis_results.json")
        with open(analysis_file, 'w') as f:
            json.dump(analysis, f, indent=2)
        print(f"📊 Analysis saved to: {analysis_file}")
        
        # Step 3: Create interactive HTML report
        print("🎨 Step 3: Creating interactive HTML report...")
        html_output = os.path.join(output_dir, f"linkedin_analysis.html")
        
        report_path = self.create_interactive_html(image_path, analysis, html_output)
        
        print(f"\n🎉 Analysis Complete!")
        print(f"📁 Output Directory: {output_dir}")
        print(f"🌐 Interactive Report: {report_path}")
        print(f"📋 Coordinates: {coords_file if section_coordinates else 'Not detected'}")
        print(f"📊 Raw Analysis: {analysis_file}")
        
        # # Automatically open the report
        # try:
        #     webbrowser.open(f'file://{os.path.abspath(report_path)}')
        #     print("🚀 Opening report in browser...")
        # except:
        #     print("💡 Please manually open the HTML file in your browser")
        
        return {
            'html_report': report_path,
            'analysis_json': analysis_file,
            'coordinates_json': coords_file if section_coordinates else None,
            'section_coordinates': section_coordinates,
            'analysis': analysis
        }

# Example usage
def main():
    """Main function to run the LinkedIn Profile Analyzer"""
    
    # Configuration
    API_KEY = os.getenv('GEMINI_API_KEY')  # Replace with your actual API key
    IMAGE_PATH = "screenshots/linkedin.png"  # Path to your LinkedIn screenshot
    
    # Initialize analyzer
    analyzer = InteractiveLinkedInAnalyzer(API_KEY)
    
    # Run complete analysis
    try:
        results = analyzer.analyze_and_create_report(
            image_path=IMAGE_PATH,
            output_dir="linkedin_analysis_output"
        )
        
        if results:
            print("\n✅ SUCCESS! Check the generated files:")
            for key, path in results.items():
                if path and key.endswith(('_report', '_json')):
                    print(f"   {key}: {path}")
    
    except FileNotFoundError:
        print(f"❌ Error: Image file '{IMAGE_PATH}' not found")
        print("Please ensure the LinkedIn screenshot exists at the specified path")
    
    except Exception as e:
        print(f"❌ Error during analysis: {e}")
        print("Please check your API key and image file")

if __name__ == "__main__":
    main()
