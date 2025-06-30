"""
AI Service for TurboFCL
Handles SageMaker integration for GPT, embeddings, and NER
"""

import asyncio
import io
import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

import boto3
import numpy as np
import PyPDF2
from app.core.config import get_settings
from docx import Document as DocxDocument

logger = logging.getLogger(__name__)


class AIService:
    def __init__(self):
        self.settings = get_settings()
        self.sagemaker_runtime = boto3.client(
            "sagemaker-runtime", region_name=self.settings.AWS_REGION
        )

        # SageMaker endpoint names
        self.gpt_endpoint = self.settings.SAGEMAKER_GPT_ENDPOINT
        self.embedding_endpoint = self.settings.SAGEMAKER_EMBEDDING_ENDPOINT
        self.ner_endpoint = self.settings.SAGEMAKER_NER_ENDPOINT

    async def generate_chat_response(
        self, user_message: str, context: List[Dict] = None
    ) -> Dict[str, Any]:
        """
        Generate AI chat response using GPT model with RAG context
        """
        try:
            # Get relevant context from vector database if not provided
            if not context:
                context = await self._get_relevant_context(user_message)

            # Build prompt with context
            context_text = "\n\n".join(
                [
                    f"Document: {doc.get('document_name', 'Unknown')}\nContent: {doc.get('chunk_text', '')}"
                    for doc in context[:3]  # Limit to top 3 most relevant
                ]
            )

            system_prompt = """You are an expert AI assistant specializing in DCSA Facility Clearance (FCL) applications. 
You help defense contractors navigate the complex FCL application process with accurate, actionable guidance.

Key principles:
- Provide specific, actionable advice
- Reference relevant DCSA regulations when applicable
- Be concise but thorough
- If unsure, recommend consulting with a facility clearance professional
- Focus on compliance and best practices"""

            full_prompt = f"""{system_prompt}

Context from DCSA guidelines and documents:
{context_text}

User question: {user_message}

Please provide a helpful, accurate answer based on the context above. If the context doesn't contain enough information, say so clearly and suggest next steps."""

            # Call SageMaker GPT endpoint
            response = self.sagemaker_runtime.invoke_endpoint(
                EndpointName=self.gpt_endpoint,
                ContentType="application/json",
                Body=json.dumps(
                    {
                        "inputs": full_prompt,
                        "parameters": {
                            "max_new_tokens": 512,
                            "temperature": 0.3,
                            "do_sample": True,
                            "top_p": 0.9,
                        },
                    }
                ),
            )

            result = json.loads(response["Body"].read())

            # Extract generated text
            if isinstance(result, list) and len(result) > 0:
                generated_text = result[0].get("generated_text", "")
                # Remove the prompt from the response
                if full_prompt in generated_text:
                    generated_text = generated_text.replace(full_prompt, "").strip()
            else:
                generated_text = result.get(
                    "generated_text",
                    "I apologize, but I encountered an issue generating a response.",
                )

            return {
                "response": generated_text,
                "sources": [doc.get("document_name", "Unknown") for doc in context],
                "confidence": 0.85,
            }

        except Exception as e:
            logger.error(f"Error generating chat response: {str(e)}")
            return {
                "response": "I'm sorry, I'm having trouble processing your request right now. Please try again later or contact support for assistance.",
                "sources": [],
                "confidence": 0.0,
            }

    async def _get_relevant_context(self, query: str, limit: int = 5) -> List[Dict]:
        """
        Get relevant context from vector database using semantic search
        """
        try:
            # Get query embedding
            query_embedding = await self.get_text_embedding(query)

            # Search vector database (this would be implemented with actual DB connection)
            # For now, return mock context
            mock_context = [
                {
                    "document_name": "DCSA FCL Guidelines",
                    "chunk_text": "Facility Clearance applications require specific documentation based on entity type. LLCs need operating agreements, corporations need bylaws and stock ledgers.",
                    "similarity": 0.85,
                },
                {
                    "document_name": "FOCI Mitigation Guide",
                    "chunk_text": "Foreign Ownership, Control, or Influence (FOCI) conditions require mitigation agreements. 5% foreign ownership triggers FOCI requirements.",
                    "similarity": 0.82,
                },
            ]

            return mock_context

        except Exception as e:
            logger.error(f"Error getting relevant context: {str(e)}")
            return []

    async def get_text_embedding(self, text: str) -> List[float]:
        """
        Get text embedding from SageMaker endpoint
        """
        try:
            response = self.sagemaker_runtime.invoke_endpoint(
                EndpointName=self.embedding_endpoint,
                ContentType="application/json",
                Body=json.dumps({"inputs": text}),
            )

            result = json.loads(response["Body"].read())

            # Extract embedding vector
            if isinstance(result, list) and len(result) > 0:
                return result[0]
            else:
                return result.get("embeddings", [])

        except Exception as e:
            logger.error(f"Error getting text embedding: {str(e)}")
            # Return zero vector as fallback
            return [0.0] * 768  # Assuming 768-dimensional embeddings

    async def extract_kmps_from_document(
        self, document_text: str
    ) -> List[Dict[str, Any]]:
        """
        Extract Key Management Personnel from document using NER model
        """
        try:
            response = self.sagemaker_runtime.invoke_endpoint(
                EndpointName=self.ner_endpoint,
                ContentType="application/json",
                Body=json.dumps(
                    {
                        "inputs": document_text,
                        "parameters": {"aggregation_strategy": "simple"},
                    }
                ),
            )

            result = json.loads(response["Body"].read())

            # Process NER results to extract KMP information
            kmps = []
            persons = []

            # Extract person entities
            for entity in result:
                if entity.get("entity_group") == "PER" and entity.get("score", 0) > 0.8:
                    persons.append(
                        {
                            "name": entity.get("word", "").strip(),
                            "confidence": entity.get("score", 0),
                        }
                    )

            # Identify potential roles based on context
            role_keywords = {
                "FSO": ["facility security officer", "fso"],
                "ITPSO": ["information technology", "it security", "itpso"],
                "SMO": ["senior management", "smo", "president", "ceo"],
                "Chairman": ["chairman", "chair", "board chair"],
                "Manager": ["manager", "managing member"],
                "Partner": ["partner", "general partner"],
            }

            # Match persons to roles based on context
            for person in persons:
                name = person["name"]
                context_window = self._get_context_around_name(document_text, name)

                identified_role = "Unknown"
                for role, keywords in role_keywords.items():
                    if any(
                        keyword.lower() in context_window.lower()
                        for keyword in keywords
                    ):
                        identified_role = role
                        break

                kmps.append(
                    {
                        "full_name": name,
                        "role": identified_role,
                        "confidence": person["confidence"],
                        "extracted_by_ai": True,
                    }
                )

            return kmps

        except Exception as e:
            logger.error(f"Error extracting KMPs: {str(e)}")
            return []

    def _get_context_around_name(
        self, text: str, name: str, window_size: int = 100
    ) -> str:
        """Get text context around a person's name"""
        try:
            index = text.lower().find(name.lower())
            if index == -1:
                return ""

            start = max(0, index - window_size)
            end = min(len(text), index + len(name) + window_size)

            return text[start:end]
        except:
            return ""

    async def process_document(
        self, file_content: bytes, filename: str
    ) -> Dict[str, Any]:
        """
        Process uploaded document to extract text and key information
        """
        try:
            # Extract text based on file type
            file_ext = filename.split(".")[-1].lower()

            if file_ext == "pdf":
                text = self._extract_text_from_pdf(file_content)
            elif file_ext in ["doc", "docx"]:
                text = self._extract_text_from_docx(file_content)
            else:
                raise ValueError(f"Unsupported file type: {file_ext}")

            # Extract KMPs using NER
            extracted_kmps = await self.extract_kmps_from_document(text)

            # Get document embedding for vector storage
            embedding = await self.get_text_embedding(text[:1000])  # First 1000 chars

            # Classify document type
            document_type = self._classify_document_type(text, filename)

            return {
                "text": text,
                "extracted_kmps": extracted_kmps,
                "embedding": embedding,
                "document_type": document_type,
                "word_count": len(text.split()),
                "processed_at": datetime.utcnow().isoformat(),
            }

        except Exception as e:
            logger.error(f"Error processing document {filename}: {str(e)}")
            return {
                "text": "",
                "extracted_kmps": [],
                "embedding": [],
                "document_type": "unknown",
                "error": str(e),
                "processed_at": datetime.utcnow().isoformat(),
            }

    def _extract_text_from_pdf(self, file_content: bytes) -> str:
        """Extract text from PDF file"""
        try:
            pdf_file = io.BytesIO(file_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)

            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"

            return text.strip()
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {str(e)}")
            return ""

    def _extract_text_from_docx(self, file_content: bytes) -> str:
        """Extract text from DOCX file"""
        try:
            doc_file = io.BytesIO(file_content)
            doc = DocxDocument(doc_file)

            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"

            return text.strip()
        except Exception as e:
            logger.error(f"Error extracting text from DOCX: {str(e)}")
            return ""

    def _classify_document_type(self, text: str, filename: str) -> str:
        """Classify document type based on content and filename"""
        text_lower = text.lower()
        filename_lower = filename.lower()

        # Document type classification rules
        if any(
            keyword in text_lower
            for keyword in ["articles of incorporation", "certificate of incorporation"]
        ):
            return "Articles of Incorporation"
        elif any(keyword in text_lower for keyword in ["bylaws", "by-laws"]):
            return "Bylaws"
        elif any(
            keyword in text_lower
            for keyword in ["operating agreement", "llc agreement"]
        ):
            return "Operating Agreement"
        elif any(keyword in text_lower for keyword in ["partnership agreement"]):
            return "Partnership Agreement"
        elif any(keyword in text_lower for keyword in ["stock ledger", "shareholder"]):
            return "Stock Ledger"
        elif any(
            keyword in filename_lower for keyword in ["license", "business license"]
        ):
            return "Business License"
        elif any(
            keyword in text_lower for keyword in ["organization chart", "org chart"]
        ):
            return "Organization Chart"
        elif any(
            keyword in text_lower for keyword in ["meeting minutes", "board minutes"]
        ):
            return "Meeting Minutes"
        elif any(keyword in text_lower for keyword in ["dd form 441", "dd-441"]):
            return "DD Form 441"
        elif any(keyword in text_lower for keyword in ["sf 328", "sf-328"]):
            return "SF 328"
        else:
            return "Other Document"

    async def validate_document_completeness(
        self, entity_type: str, uploaded_documents: List[str]
    ) -> Dict[str, Any]:
        """
        Validate if all required documents are uploaded for entity type
        """
        from app.constants.business_rules import ENTITY_REQUIREMENTS

        required_docs = ENTITY_REQUIREMENTS.get(entity_type, {}).get("documents", [])
        uploaded_lower = [doc.lower() for doc in uploaded_documents]

        missing_docs = []
        for req_doc in required_docs:
            if not any(req_doc.lower() in uploaded for uploaded in uploaded_lower):
                missing_docs.append(req_doc)

        completion_rate = (
            (len(required_docs) - len(missing_docs)) / len(required_docs)
            if required_docs
            else 1.0
        )

        return {
            "completion_rate": completion_rate,
            "missing_documents": missing_docs,
            "total_required": len(required_docs),
            "uploaded_count": len(required_docs) - len(missing_docs),
            "is_complete": len(missing_docs) == 0,
        }
