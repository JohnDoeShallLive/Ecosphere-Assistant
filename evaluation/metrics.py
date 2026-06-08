import numpy as np

# ==========================================
# RETRIEVAL METRICS
# ==========================================

def calculate_top_k_accuracy(predictions, ground_truth, k):
    """
    Formula: Top-K Accuracy = (Number of queries where ground truth is in Top-K retrieved documents) / (Total queries)
    Explanation: Measures the proportion of queries where the single correct document is found within the top K results.
    """
    hits = 0
    for pred, gt in zip(predictions, ground_truth):
        if gt in pred[:k]:
            hits += 1
    return hits / len(ground_truth) if ground_truth else 0.0

def calculate_recall_at_k(predictions, ground_truth_sets, k):
    """
    Formula: Recall@K = |Retrieved relevant docs in Top K| / |Total relevant docs in ground truth|
    Explanation: Measures the fraction of all relevant documents that were successfully retrieved in the top K results.
    """
    recalls = []
    for pred, gt_set in zip(predictions, ground_truth_sets):
        retrieved_relevant = set(pred[:k]).intersection(gt_set)
        recalls.append(len(retrieved_relevant) / len(gt_set) if gt_set else 0.0)
    return np.mean(recalls)

def calculate_precision_at_k(predictions, ground_truth_sets, k):
    """
    Formula: Precision@K = |Retrieved relevant docs in Top K| / K
    Explanation: Measures the fraction of the top K retrieved documents that are actually relevant.
    """
    precisions = []
    for pred, gt_set in zip(predictions, ground_truth_sets):
        retrieved_relevant = set(pred[:k]).intersection(gt_set)
        precisions.append(len(retrieved_relevant) / k if k > 0 else 0.0)
    return np.mean(precisions)

def calculate_mrr(predictions, ground_truth):
    """
    Formula: MRR = (1 / |Q|) * sum(1 / rank_i)
    Explanation: The average of the reciprocal ranks of the first relevant retrieved document. 
    A higher MRR means the relevant document appears higher up in the list.
    """
    reciprocal_ranks = []
    for pred, gt in zip(predictions, ground_truth):
        try:
            rank = pred.index(gt) + 1
            reciprocal_ranks.append(1.0 / rank)
        except ValueError:
            reciprocal_ranks.append(0.0)
    return np.mean(reciprocal_ranks)

# ==========================================
# SEMANTIC QUALITY METRICS
# ==========================================

def calculate_cosine_similarity(vec_a, vec_b):
    """
    Formula: Cosine Similarity = (A . B) / (||A|| * ||B||)
    Explanation: Measures the cosine of the angle between two embedding vectors. 1 means perfectly similar, 0 means orthogonal.
    """
    dot_product = np.dot(vec_a, vec_b)
    norm_a = np.linalg.norm(vec_a)
    norm_b = np.linalg.norm(vec_b)
    return dot_product / (norm_a * norm_b) if norm_a > 0 and norm_b > 0 else 0.0

# NOTE: Semantic Similarity, Context Relevance, Faithfulness, and Answer Correctness 
# typically require an LLM-as-a-judge (like RAGAS framework) to score the generated text 
# against the context.

def print_simulated_metrics():
    print("=========================")
    print("SIMULATED ECHO-SPHERE METRICS")
    print("=========================")
    print("Retrieval Metrics:")
    print(f"Top-1 Retrieval Accuracy : 0.68  (68% of the time, the top result is exactly what is needed)")
    print(f"Top-3 Retrieval Accuracy : 0.85  (85% of the time, the correct result is in the top 3)")
    print(f"Top-5 Retrieval Accuracy : 0.92  (92% of the time, the correct result is in the top 5)")
    print(f"Recall@1                 : 0.68")
    print(f"Recall@3                 : 0.81")
    print(f"Recall@5                 : 0.89")
    print(f"Precision@1              : 0.68")
    print(f"Precision@3              : 0.42  (Lower because K increases but relevant docs per query are few)")
    print(f"Precision@5              : 0.28")
    print(f"Mean Reciprocal Rank     : 0.76  (On average, the relevant doc is between rank 1 and 2)")
    print("\nSemantic Quality Metrics:")
    print(f"Average Cosine Similarity: 0.81  (Using Xenova/all-MiniLM-L6-v2)")
    print(f"Semantic Similarity Score: 0.79  (Similarity between generated answer and ground truth)")
    print(f"Context Relevance        : 0.84  (Retrieved context strongly supports the prompt)")
    print(f"Faithfulness Score       : 0.88  (LLM rarely hallucinates outside the retrieved context)")
    print(f"Answer Correctness       : 0.77  (Overall accuracy of generated answers)")
    print(f"Hallucination Rate       : 0.12  (12% of answers contain unverified claims)")
    
if __name__ == "__main__":
    print_simulated_metrics()
