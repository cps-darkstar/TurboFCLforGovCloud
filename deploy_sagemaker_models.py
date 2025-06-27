#!/usr/bin/env python3
"""
Deploy SageMaker models for TurboFCL in AWS GovCloud
Includes GPT-NeoX for text generation, embeddings, and NER models
"""

import boto3
import sagemaker
from sagemaker.huggingface import HuggingFaceModel
import argparse
import json
import time
from datetime import datetime

def deploy_gpt_model(role_arn, region):
    """Deploy GPT-NeoX model for text generation"""
    print("Deploying GPT-NeoX model...")
    
    huggingface_model = HuggingFaceModel(
        model_data="s3://turbofcl-models-gov/gpt-neox-20b/model.tar.gz",  # Pre-uploaded model
        role=role_arn,
        transformers_version="4.26.0",
        pytorch_version="1.13.0",
        py_version="py39",
        env={
            "HF_MODEL_ID": "EleutherAI/gpt-neox-20b",
            "HF_TASK": "text-generation",
            "SAGEMAKER_CONTAINER_LOG_LEVEL": "20",
            "SAGEMAKER_REGION": region
        }
    )
    
    predictor = huggingface_model.deploy(
        initial_instance_count=1,
        instance_type="ml.g4dn.xlarge",  # GPU instance for large model
        endpoint_name="turbofcl-gpt-endpoint",
        tags=[
            {"Key": "Project", "Value": "TurboFCL"},
            {"Key": "Environment", "Value": "Production"},
            {"Key": "Model", "Value": "GPT-NeoX-20B"}
        ]
    )
    
    print(f"✓ GPT endpoint deployed: {predictor.endpoint_name}")
    return predictor.endpoint_name

def deploy_embedding_model(role_arn, region):
    """Deploy sentence transformer model for embeddings"""
    print("Deploying embedding model...")
    
    huggingface_model = HuggingFaceModel(
        model_data="s3://turbofcl-models-gov/sentence-transformers/model.tar.gz",
        role=role_arn,
        transformers_version="4.26.0",
        pytorch_version="1.13.0",
        py_version="py39",
        env={
            "HF_MODEL_ID": "sentence-transformers/all-mpnet-base-v2",
            "HF_TASK": "feature-extraction"
        }
    )
    
    predictor = huggingface_model.deploy(
        initial_instance_count=1,
        instance_type="ml.m5.large",  # CPU instance sufficient for embeddings
        endpoint_name="turbofcl-embedding-endpoint",
        tags=[
            {"Key": "Project", "Value": "TurboFCL"},
            {"Key": "Environment", "Value": "Production"},
            {"Key": "Model", "Value": "Sentence-Transformer"}
        ]
    )
    
    print(f"✓ Embedding endpoint deployed: {predictor.endpoint_name}")
    return predictor.endpoint_name

def deploy_ner_model(role_arn, region):
    """Deploy NER model for KMP extraction"""
    print("Deploying NER model...")
    
    huggingface_model = HuggingFaceModel(
        model_data="s3://turbofcl-models-gov/ner-model/model.tar.gz",
        role=role_arn,
        transformers_version="4.26.0",
        pytorch_version="1.13.0",
        py_version="py39",
        env={
            "HF_MODEL_ID": "dslim/bert-base-NER",
            "HF_TASK": "token-classification"
        }
    )
    
    predictor = huggingface_model.deploy(
        initial_instance_count=1,
        instance_type="ml.m5.large",
        endpoint_name="turbofcl-ner-endpoint",
        tags=[
            {"Key": "Project", "Value": "TurboFCL"},
            {"Key": "Environment", "Value": "Production"},
            {"Key": "Model", "Value": "BERT-NER"}
        ]
    )
    
    print(f"✓ NER endpoint deployed: {predictor.endpoint_name}")
    return predictor.endpoint_name

def configure_auto_scaling(endpoint_name, min_capacity=1, max_capacity=5):
    """Configure auto-scaling for SageMaker endpoint"""
    print(f"Configuring auto-scaling for {endpoint_name}...")
    
    client = boto3.client('application-autoscaling')
    
    # Register scalable target
    response = client.register_scalable_target(
        ServiceNamespace='sagemaker',
        ResourceId=f'endpoint/{endpoint_name}/variant/AllTraffic',
        ScalableDimension='sagemaker:variant:DesiredInstanceCount',
        MinCapacity=min_capacity,
        MaxCapacity=max_capacity
    )
    
    # Create scaling policy
    response = client.put_scaling_policy(
        PolicyName=f'{endpoint_name}-scaling-policy',
        ServiceNamespace='sagemaker',
        ResourceId=f'endpoint/{endpoint_name}/variant/AllTraffic',
        ScalableDimension='sagemaker:variant:DesiredInstanceCount',
        PolicyType='TargetTrackingScaling',
        TargetTrackingScalingPolicyConfiguration={
            'TargetValue': 70.0,
            'PredefinedMetricSpecification': {
                'PredefinedMetricType': 'SageMakerVariantInvocationsPerInstance'
            },
            'ScaleOutCooldown': 300,
            'ScaleInCooldown': 300
        }
    )
    
    print(f"✓ Auto-scaling configured for {endpoint_name}")

def test_endpoint(endpoint_name, runtime_client):
    """Test deployed endpoint"""
    print(f"Testing endpoint: {endpoint_name}...")
    
    try:
        if "gpt" in endpoint_name:
            payload = {
                "inputs": "What are the key requirements for obtaining a facility clearance?",
                "parameters": {
                    "max_new_tokens": 50,
                    "temperature": 0.3
                }
            }
        elif "embedding" in endpoint_name:
            payload = {
                "inputs": "This is a test sentence for embedding generation."
            }
        elif "ner" in endpoint_name:
            payload = {
                "inputs": "John Smith is the CEO and Jane Doe is the FSO of Acme Corp."
            }
        else:
            payload = {"inputs": "test"}
        
        response = runtime_client.invoke_endpoint(
            EndpointName=endpoint_name,
            ContentType='application/json',
            Body=json.dumps(payload)
        )
        
        result = json.loads(response['Body'].read())
        print(f"✓ Endpoint test successful")
        return True
    except Exception as e:
        print(f"✗ Endpoint test failed: {str(e)}")
        return False

def store_endpoints_in_ssm(endpoints, region):
    """Store endpoint names in SSM Parameter Store"""
    print("Storing endpoint names in SSM Parameter Store...")
    
    ssm_client = boto3.client('ssm', region_name=region)
    
    for endpoint_type, endpoint_name in endpoints.items():
        parameter_name = f"/turbofcl/sagemaker/{endpoint_type}_endpoint"
        
        try:
            ssm_client.put_parameter(
                Name=parameter_name,
                Value=endpoint_name,
                Type='String',
                Overwrite=True,
                Tags=[
                    {'Key': 'Project', 'Value': 'TurboFCL'},
                    {'Key': 'Type', 'Value': 'SageMaker-Endpoint'}
                ]
            )
            print(f"✓ Stored {parameter_name}")
        except Exception as e:
            print(f"✗ Failed to store {parameter_name}: {str(e)}")

def main():
    parser = argparse.ArgumentParser(description='Deploy SageMaker models for TurboFCL')
    parser.add_argument('--region', default='us-gov-west-1', help='AWS region')
    parser.add_argument('--profile', default='govcloud', help='AWS profile')
    parser.add_argument('--role-name', default='TurboFCL-SageMaker-ExecutionRole', 
                        help='SageMaker execution role name')
    parser.add_argument('--skip-gpt', action='store_true', help='Skip GPT model deployment')
    parser.add_argument('--skip-auto-scaling', action='store_true', help='Skip auto-scaling configuration')
    
    args = parser.parse_args()
    
    # Set up boto3 session
    boto3.setup_default_session(profile_name=args.profile, region_name=args.region)
    
    # Get SageMaker execution role
    iam_client = boto3.client('iam')
    try:
        role_response = iam_client.get_role(RoleName=args.role_name)
        role_arn = role_response['Role']['Arn']
        print(f"Using SageMaker execution role: {role_arn}")
    except Exception as e:
        print(f"Error getting role: {str(e)}")
        print("Please ensure the SageMaker execution role exists")
        return 1
    
    # Initialize SageMaker session
    sagemaker_session = sagemaker.Session()
    runtime_client = boto3.client('sagemaker-runtime')
    
    endpoints = {}
    
    try:
        # Deploy models
        if not args.skip_gpt:
            endpoints['gpt'] = deploy_gpt_model(role_arn, args.region)
        
        endpoints['embedding'] = deploy_embedding_model(role_arn, args.region)
        endpoints['ner'] = deploy_ner_model(role_arn, args.region)
        
        # Wait for endpoints to be ready
        print("\nWaiting for endpoints to become available...")
        time.sleep(60)
        
        # Test endpoints
        print("\nTesting deployed endpoints...")
        for endpoint_name in endpoints.values():
            test_endpoint(endpoint_name, runtime_client)
        
        # Configure auto-scaling
        if not args.skip_auto_scaling:
            print("\nConfiguring auto-scaling...")
            if 'gpt' in endpoints:
                configure_auto_scaling(endpoints['gpt'], min_capacity=1, max_capacity=5)
            configure_auto_scaling(endpoints['embedding'], min_capacity=1, max_capacity=3)
            configure_auto_scaling(endpoints['ner'], min_capacity=1, max_capacity=3)
        
        # Store endpoints in SSM
        store_endpoints_in_ssm(endpoints, args.region)
        
        # Save deployment info
        deployment_info = {
            "timestamp": datetime.utcnow().isoformat(),
            "region": args.region,
            "endpoints": endpoints,
            "role_arn": role_arn
        }
        
        with open("sagemaker-deployment-info.json", "w") as f:
            json.dump(deployment_info, f, indent=2)
        
        print("\n✅ SageMaker deployment completed successfully!")
        print(f"Deployment info saved to sagemaker-deployment-info.json")
        
        return 0
        
    except Exception as e:
        print(f"\n❌ Deployment failed: {str(e)}")
        return 1

if __name__ == "__main__":
    exit(main()) 