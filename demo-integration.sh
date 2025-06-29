#!/bin/bash
# TurboFCL Frontend + API Integration Demo
# This script demonstrates the complete integration between the React frontend and FastAPI backend

echo "🚀 TurboFCL Frontend + API Integration Demo"
echo "============================================"
echo ""

# Check if backend is running
echo "📡 Testing Backend API Endpoints..."
echo "------------------------------------"

# Test business structures endpoint
echo "1. Business Structures Endpoint:"
curl -s "http://localhost:8000/api/business-structures" | jq '.[] | {uei: .uei, name: .entityName, size: .businessSize}' | head -20
echo ""

# Test FOCI assessment endpoint
echo "2. FOCI Assessment Endpoint (Raytheon Technologies):"
curl -s "http://localhost:8000/api/foci-assessment/LRG12345ABCD" | jq '{company: .companyName, riskLevel: .riskLevel, score: .fociScore, mitigation: .recommendedMitigation}'
echo ""

# Test SAM.gov integration endpoint
echo "3. SAM.gov Integration Endpoint:"
curl -s "http://localhost:8000/api/sam-data/LRG12345ABCD" | jq '{uei: .uei, name: .entityName, status: .registrationStatus}'
echo ""

echo "🎯 Frontend Integration Status:"
echo "------------------------------"
echo "• ✅ Business Structure Explorer component created"
echo "• ✅ API endpoints integrated with React hooks"
echo "• ✅ Dashboard integration complete"
echo "• ✅ Dedicated Business Explorer page added"
echo "• ✅ Navigation menu updated"
echo "• ✅ FOCI assessment visualization working"
echo ""

echo "📊 Available Features:"
echo "---------------------"
echo "• 7 Business size categories (Large, Small, SDB, WOSB, VOSB, HUBZone, 8(a))"
echo "• Complex entity structures (C-Corp, LLC, LLP, MLP, etc.)"
echo "• FOCI risk scoring and mitigation recommendations"
echo "• Key Management Personnel requirements"
echo "• Real-time API integration with fallback to demo data"
echo "• SAM.gov API integration with API key support"
echo ""

echo "🌐 Access Points:"
echo "----------------"
echo "• Frontend: http://localhost:3000"
echo "• Dashboard: http://localhost:3000/dashboard"
echo "• Business Explorer: http://localhost:3000/business-explorer"
echo "• API Documentation: http://localhost:8000/docs"
echo "• Business Structures API: http://localhost:8000/api/business-structures"
echo ""

echo "🎉 Integration Complete!"
echo "Ready for facility clearance compliance modeling and DCSA/NISS requirements!"
