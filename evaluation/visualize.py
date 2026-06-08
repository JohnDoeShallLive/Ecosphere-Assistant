import matplotlib.pyplot as plt
import numpy as np
import os

# Create output directory
output_dir = "visualizations"
if not os.path.exists(output_dir):
    os.makedirs(output_dir)

# Data for simulation
k_values = [1, 2, 3, 4, 5]
accuracy_data = [0.68, 0.77, 0.85, 0.89, 0.92]
recall_data = [0.68, 0.75, 0.81, 0.86, 0.89]
precision_data = [0.68, 0.52, 0.42, 0.35, 0.28]
latency_data = [210, 245, 290, 315, 340, 280, 265, 305, 350, 410] # Simulated in ms
cpu_usage = [15, 22, 68, 75, 82, 45, 30, 25, 20, 15] # Simulated % over 10 seconds
ram_usage = [1.2, 1.25, 1.8, 2.4, 2.8, 2.8, 2.7, 2.5, 2.4, 2.4] # Simulated GB over 10 seconds

def plot_accuracy_curve():
    plt.figure(figsize=(8, 5))
    plt.plot(k_values, accuracy_data, marker='o', linestyle='-', color='blue')
    plt.title('Top-K Retrieval Accuracy')
    plt.xlabel('K (Number of Retrieved Documents)')
    plt.ylabel('Accuracy Score')
    plt.grid(True, linestyle='--', alpha=0.7)
    plt.xticks(k_values)
    plt.ylim(0, 1.0)
    plt.savefig(f"{output_dir}/retrieval_accuracy.png", dpi=300)
    plt.close()

def plot_recall_precision():
    plt.figure(figsize=(8, 5))
    plt.plot(k_values, recall_data, marker='s', linestyle='-', color='green', label='Recall@K')
    plt.plot(k_values, precision_data, marker='^', linestyle='--', color='red', label='Precision@K')
    plt.title('Recall and Precision at K')
    plt.xlabel('K (Number of Retrieved Documents)')
    plt.ylabel('Score')
    plt.legend()
    plt.grid(True, linestyle='--', alpha=0.7)
    plt.xticks(k_values)
    plt.ylim(0, 1.0)
    plt.savefig(f"{output_dir}/recall_precision.png", dpi=300)
    plt.close()

def plot_query_latency():
    plt.figure(figsize=(8, 5))
    plt.plot(range(1, 11), latency_data, marker='o', color='purple')
    plt.title('Query Latency Over Sequential Requests')
    plt.xlabel('Request Number')
    plt.ylabel('Latency (ms)')
    plt.grid(True, linestyle='--', alpha=0.7)
    plt.axhline(y=np.mean(latency_data), color='r', linestyle=':', label='Average Latency')
    plt.legend()
    plt.savefig(f"{output_dir}/query_latency.png", dpi=300)
    plt.close()

def plot_resource_usage():
    fig, ax1 = plt.subplots(figsize=(8, 5))
    
    color = 'tab:red'
    ax1.set_xlabel('Time (seconds)')
    ax1.set_ylabel('CPU Usage (%)', color=color)
    ax1.plot(range(1, 11), cpu_usage, color=color, marker='o')
    ax1.tick_params(axis='y', labelcolor=color)
    
    ax2 = ax1.twinx()  
    color = 'tab:blue'
    ax2.set_ylabel('RAM Usage (GB)', color=color)  
    ax2.plot(range(1, 11), ram_usage, color=color, marker='s')
    ax2.tick_params(axis='y', labelcolor=color)
    
    plt.title('Resource Usage During RAG Pipeline Execution')
    fig.tight_layout()  
    plt.savefig(f"{output_dir}/resource_usage.png", dpi=300)
    plt.close()

def plot_confusion_matrix():
    # Simulated binary retrieval success vs failure
    # Actual Positive: Relevant Doc Exists
    # Predicted Positive: Relevant Doc Found in Top-3
    confusion_matrix = np.array([[85, 15],  # True Positives, False Negatives
                                 [10, 90]]) # False Positives, True Negatives
    
    fig, ax = plt.subplots(figsize=(6, 6))
    cax = ax.matshow(confusion_matrix, cmap='Blues')
    plt.colorbar(cax)
    
    for (i, j), z in np.ndenumerate(confusion_matrix):
        ax.text(j, i, f'{z}', ha='center', va='center', fontsize=14)
        
    plt.title('Confusion Matrix: Retrieval Success (Top-3)', pad=20)
    plt.xticks([0, 1], ['Predicted Success', 'Predicted Failure'])
    plt.yticks([0, 1], ['Actual Success', 'Actual Failure'])
    plt.savefig(f"{output_dir}/confusion_matrix.png", dpi=300)
    plt.close()

if __name__ == "__main__":
    print("Generating visual plots in 'visualizations/' directory...")
    plot_accuracy_curve()
    plot_recall_precision()
    plot_query_latency()
    plot_resource_usage()
    plot_confusion_matrix()
    print("Done!")
