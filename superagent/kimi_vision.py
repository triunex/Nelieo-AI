"""
Kimi k2.5 Vision API Adapter for SuperAgent
Moonshot AI's latest powerful model (OpenAI-compatible)
"""

import os
import time
import base64
import json
import logging
import requests
from io import BytesIO
from typing import Dict, Any, Optional, List
from PIL import Image

logger = logging.getLogger(__name__)

class KimiVisionAPI:
    """
    Kimi Vision API - High performance fallback for enterprise tasks
    
    Features:
    - OpenAI-compatible API
    - High accuracy for complex reasoning
    - Enterprise-grade reliability
    """
    
    def __init__(
        self,
        api_key: str,
        model: str = "kimi-latest",  # Or k2.5 when available in API
        timeout: int = 45,
        **kwargs: Any
    ):
        self.api_key = api_key
        self.model = model
        self.timeout = timeout
        self.base_url = "https://api.moonshot.cn/v1/chat/completions"
        self._last_call_time = 0.0
        logger.info(f"Kimi Vision API initialized (model: {model})")

    def _encode_image(self, image: Image.Image) -> str:
        """Convert PIL Image to base64 JPEG"""
        buffered = BytesIO()
        # Optimization: Resize if too large for faster upload
        if image.width > 1280 or image.height > 1280:
            image.thumbnail((1280, 1280), Image.LANCZOS)
            
        image.convert("RGB").save(buffered, format="JPEG", quality=85)
        return base64.b64encode(buffered.getvalue()).decode("utf-8")

    def analyze_screen(
        self, 
        screenshot: Image.Image, 
        task: str, 
        context: Optional[Dict] = None,
        mode: str = "action"
    ) -> Dict[str, Any]:
        """
        Match the GeminiVisionAPI analyze_screen signature for easy swap/fallback
        """
        img_base64 = self._encode_image(screenshot)
        
        system_prompt = "You are a screen automation expert. Analyze the provided screenshot and provide the next step to complete the task. Respond in JSON format."
        
        messages = [
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": f"Task: {task}\n\nAnalyze the screen and determine the next action. Context: {json.dumps(context or {})}"
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{img_base64}"
                        }
                    }
                ]
            }
        ]

        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": self.model,
                "messages": messages,
                "max_tokens": 1000,
                "response_format": {"type": "json_object"}
            }

            response = requests.post(
                self.base_url,
                headers=headers,
                json=payload,
                timeout=self.timeout
            )
            response.raise_for_status()
            
            result = response.json()
            content = result["choices"][0]["message"]["content"]
            
            # Parse the JSON string from Kimi
            return json.loads(content)

        except Exception as e:
            logger.error(f"Kimi API Error: {e}")
            return {"error": str(e), "action": {"type": "wait", "reason": "API call failed"}}

    def call_with_image(self, image: Image.Image, prompt: str, system_prompt: str = "") -> str:
        """Simple text response for image queries"""
        img_base64 = self._encode_image(image)
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
            
        messages.append({
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{img_base64}"}}
            ]
        })

        try:
            response = requests.post(
                self.base_url,
                headers=headers,
                json={
                    "model": self.model,
                    "messages": messages,
                    "max_tokens": 1000
                },
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]
        except Exception as e:
            logger.error(f"Kimi API Error: {e}")
            return f"Error: {e}"
